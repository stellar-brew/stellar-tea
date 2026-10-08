"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useWallet } from "@/lib/hooks/useWallet";
import { useWalletBalance } from "@/lib/hooks/useWalletBalance";
import { STARS_BALANCE_REFRESH_EVENT } from "@/lib/hooks/useStarsBalance";
import { fetchStarsMetadata, type StarsWalletSigner } from "@/lib/contracts/stars";
import { createSwapClient, fetchSwapRate } from "@/lib/contracts/swap";
import { parseAmountToI128 } from "@/lib/util/tokenMath";
import { extractSorobanErrorMessage } from "@/lib/util/soroban";
import { transactionExplorerUrl } from "@/lib/stellarConfig";

const STROOPS_PER_XLM = 10_000_000n;
const MIN_XLM_SWAP = 1;
const SLIPPAGE_OPTIONS = [0.1, 0.5, 1.0];

const formatAmount = (value: number, fractionDigits = 2) =>
  value.toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });

export default function SwapPage() {
  const { address, signTransaction } = useWallet();
  const { balances, isLoading, updateBalance } = useWalletBalance();

  const [xlmAmount, setXlmAmount] = useState("10");
  const [slippage, setSlippage] = useState<number>(SLIPPAGE_OPTIONS[1]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [tokenMeta, setTokenMeta] = useState({
    decimals: 7,
    name: "Stars",
    symbol: "STARS",
  });
  const [swapRate, setSwapRate] = useState<{ num: bigint; den: bigint } | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadMetadata = async () => {
      try {
        const metadata = await fetchStarsMetadata();
        if (!cancelled) {
          setTokenMeta(metadata);
        }
      } catch (error) {
        console.error("Failed to load STARS metadata", error);
      }
    };

    void loadMetadata();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadRate = async () => {
      try {
        const onchainRate = await fetchSwapRate();
        if (!cancelled) {
          setSwapRate({ num: onchainRate.starsPerXlmNum, den: onchainRate.starsPerXlmDen });
          setRateError(null);
        }
      } catch (error) {
        console.error("Failed to load the swap rate", error);
        if (!cancelled) {
          setSwapRate(null);
          setRateError(
            error instanceof Error ? error.message : "Unable to read the on-chain swap rate.",
          );
        }
      }
    };

    void loadRate();

    return () => {
      cancelled = true;
    };
  }, []);

  const nativeBalance = useMemo(() => {
    const native = balances.find(
      ({ asset_type }) => asset_type === "native",
    )?.balance;
    const parsed = native ? Number.parseFloat(native) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  }, [balances]);

  const rateValue = useMemo(() => {
    if (!swapRate) return null;
    return Number(swapRate.num) / Number(swapRate.den);
  }, [swapRate]);

  const nextStarsAmount = useMemo(() => {
    const amount = Number.parseFloat(xlmAmount);
    if (!Number.isFinite(amount) || amount <= 0 || rateValue === null) return "0.00";
    return formatAmount(amount * rateValue, 2);
  }, [xlmAmount, rateValue]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedAmount = Number.parseFloat(xlmAmount);

    if (!address) {
      toast({
        title: "Wallet required",
        description: "Connect your Stellar wallet before swapping.",
        dismissible: true,
      });
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Enter a valid XLM amount to continue.",
      });
      return;
    }

    if (parsedAmount < MIN_XLM_SWAP) {
      toast({
        title: "Amount too small",
        description: `Minimum swap size is ${MIN_XLM_SWAP} XLM.`,
      });
      return;
    }

    if (parsedAmount > nativeBalance) {
      toast({
        title: "Insufficient balance",
        description: "Reduce the amount or top up your XLM holdings.",
      });
      return;
    }

    if (!signTransaction) {
      toast({
        title: "Wallet missing signer",
        description: "Reconnect your wallet to sign Soroban transactions.",
      });
      return;
    }

    if (!swapRate) {
      toast({
        title: "Rate unavailable",
        description:
          rateError ?? "The on-chain swap rate is not configured. Try again shortly.",
      });
      return;
    }

    setIsConfirming(true);
    try {
      const xlmAmountInStroops = parseAmountToI128(xlmAmount, 7);
      const starsDecimals = BigInt(Math.max(0, tokenMeta.decimals));
      const starsScale = 10n ** starsDecimals;
      const amountToMint =
        (xlmAmountInStroops * swapRate.num * starsScale) /
        (swapRate.den * STROOPS_PER_XLM);

      if (amountToMint <= 0n || xlmAmountInStroops <= 0n) {
        throw new Error("Swap amount resolves to zero.");
      }

      if (!process.env.NEXT_PUBLIC_SWAP_CONTRACT_ID) {
        throw new Error("Swap contract ID missing. Set NEXT_PUBLIC_SWAP_CONTRACT_ID.");
      }

      const swapClient = createSwapClient({
        publicKey: address,
        signer: signTransaction as StarsWalletSigner,
      });

      const tx = await swapClient.swap({
        initiator: address,
        recipient: address,
        stars_amount: amountToMint,
        xlm_amount: xlmAmountInStroops,
      });

      const pendingSigners = tx.needsNonInvokerSigningBy?.() ?? [];
      if (pendingSigners.length > 0) {
        const signerList = pendingSigners.join(", ");
        throw new Error(
          `Swap requires additional signatures: ${signerList}. Ensure the STARS admin wallet also signs this transaction.`,
        );
      }

      const sent = await tx.signAndSend();
      const txHash =
        sent.getTransactionResponse?.txHash ?? sent.sendTransactionResponse?.hash;
      const explorerUrl = transactionExplorerUrl(txHash);

      toast({
        title: "Swap completed",
        description: (
          <div className="flex flex-col gap-1">
            <span>
              Minted ~{nextStarsAmount} {tokenMeta.symbol}.
            </span>
            {explorerUrl ? (
              <Link
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-purple-600 underline-offset-4 hover:underline"
              >
                View transaction in explorer →
              </Link>
            ) : txHash ? (
              <span className="break-all text-xs text-slate-500">
                Transaction hash: {txHash}
              </span>
            ) : null}
          </div>
        ),
        dismissible: true,
      });
      await updateBalance();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(STARS_BALANCE_REFRESH_EVENT));
      }
      setXlmAmount("0");
    } catch (error) {
      console.error(error);
      toast({
        title: "Swap failed",
        description: extractSorobanErrorMessage(error, "We could not submit the swap."),
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleUseMax = () => {
    if (!nativeBalance || nativeBalance <= MIN_XLM_SWAP) {
      setXlmAmount(nativeBalance.toFixed(2));
      return;
    }
    const buffer = Math.max(nativeBalance * 0.01, 0.5);
    const amount = Math.max(nativeBalance - buffer, MIN_XLM_SWAP);
    setXlmAmount(amount.toFixed(2));
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-[#fff8f0] via-[#fdf2ff] to-[#f2f7ff] pb-24 pt-20">
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(189,140,255,0.22),_transparent_70%)]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 px-6">
        <section className="space-y-4">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-purple-500 shadow-[0_15px_35px_rgba(216,180,254,0.28)]">
            Swap Desk
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-slate-800 md:text-5xl">
            Swap XLM into STARS with transparent pricing and instant execution.
          </h1>
          <p className="max-w-2xl text-base text-slate-600 md:text-lg">
            Route liquidity through the Stellar automated market maker and
            receive STARS tokens in seconds. Connect your wallet, set your risk
            preferences, and review the projected outcome before confirming.
          </p>
        </section>

        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/60 bg-white/90 p-8 shadow-[0_35px_85px_rgba(189,140,255,0.22)] backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-700">
                Swap details
              </h2>
              <span className="text-xs uppercase tracking-[0.28em] text-slate-400">
                Rate 1 XLM ={" "}
                {rateValue === null ? "—" : formatAmount(rateValue, 2)} STARS
              </span>
            </div>

            <div className="mt-8 space-y-6">
              <div className="space-y-3">
                <label
                  htmlFor="xlmAmount"
                  className="block text-xs font-semibold uppercase tracking-[0.26em] text-slate-500"
                >
                  Amount in XLM
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/70 px-4 py-4 shadow-[0_20px_55px_rgba(189,140,255,0.18)] focus-within:border-purple-300">
                  <div className="flex flex-1 flex-col">
                    <input
                      id="xlmAmount"
                      name="xlmAmount"
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min={0}
                      value={xlmAmount}
                      onChange={(event) => setXlmAmount(event.target.value)}
                      className="w-full border-0 bg-transparent text-3xl font-semibold text-slate-800 outline-none placeholder:text-slate-300"
                      placeholder="0.00"
                    />
                    <span className="text-xs text-slate-500">
                      Balance:{" "}
                      {isLoading
                        ? "Loading…"
                        : `${formatAmount(nativeBalance, 2)} XLM`}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-purple-200 bg-purple-50 px-5 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-purple-600 hover:bg-purple-100"
                    onClick={handleUseMax}
                  >
                    Use Max
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <span className="block text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                  Slippage tolerance
                </span>
                <div className="flex flex-wrap gap-3">
                  {SLIPPAGE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSlippage(option)}
                      className={`rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition ${
                        slippage === option
                          ? "border-purple-400 bg-purple-100 text-purple-700 shadow-[0_10px_25px_rgba(189,140,255,0.18)]"
                          : "border-white/70 bg-white/70 text-slate-500 hover:border-purple-200 hover:text-purple-600"
                      }`}
                    >
                      {option}% 
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  If the execution price moves by more than your tolerance, the
                  transaction will cancel automatically.
                </p>
              </div>

              <div className="space-y-4 rounded-2xl border border-white/70 bg-white/70 p-5 shadow-[0_12px_32px_rgba(189,140,255,0.16)]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">You receive</span>
                  <span className="text-lg font-semibold text-slate-700">
                    {nextStarsAmount} {tokenMeta.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Slippage guard</span>
                  <span className="text-sm font-semibold text-slate-700">
                    {slippage}%
                  </span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="candy"
              disabled={isConfirming || !swapRate}
              className="mt-8 h-14 w-full rounded-full text-sm font-semibold uppercase tracking-[0.3em]"
            >
              {isConfirming ? "Submitting…" : "Swap now"}
            </Button>

            <p className="mt-4 text-center text-xs text-slate-500">
              Swapping requires a connected wallet with at least {MIN_XLM_SWAP}{" "}
              XLM available for trade and fees.
            </p>
          </form>

          <aside className="flex flex-col gap-6 rounded-3xl border border-white/60 bg-white/80 p-8 shadow-[0_30px_75px_rgba(189,140,255,0.20)] backdrop-blur-2xl">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-700">
                Before you swap
              </h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li>
                  • Ensure your wallet trusts the STARS asset issuer contract.
                </li>
                <li>
                  • Keep at least 1 XLM free to avoid Stellar reserve issues.
                </li>
                <li>• Adjust slippage to match your risk appetite.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-6 text-sm text-purple-800">
              <h4 className="text-base font-semibold text-purple-700">
                Pro tip
              </h4>
              <p className="mt-2">
                For larger trades, split the order into several batches to
                stay within the available liquidity.
              </p>
            </div>

            <div className="space-y-2 text-sm text-slate-600">
              <p>
                Need help configuring your wallet or verifying the on-chain
                transaction?
              </p>
              <Link
                href="https://developers.stellar.org/docs/building-apps-and-smart-contracts/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-semibold text-purple-600 underline-offset-2 hover:underline"
              >
                Review the Stellar developer guide →
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

