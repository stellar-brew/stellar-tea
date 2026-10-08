"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useWallet } from "@/lib/hooks/useWallet";
import {
  fetchMarketplaceListings,
  paymentTokenLabel,
  createGameClient,
} from "@/lib/contracts/game";
import { fetchBallsMetadata } from "@/lib/contracts/balls";
import { fetchStarsMetadata } from "@/lib/contracts/stars";
import { fetchTeaMetadata } from "@/lib/contracts/nft";

type MarketplaceItem = Awaited<ReturnType<typeof fetchMarketplaceListings>>[number];

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; listings: MarketplaceItem[] }
  | { status: "error"; message: string };

type TokenMeta = {
  BALLS: { decimals: number; symbol: string };
  STARS: { decimals: number; symbol: string };
};

const defaultTokenMeta: TokenMeta = {
  BALLS: { decimals: 8, symbol: "BALLS" },
  STARS: { decimals: 8, symbol: "STARS" },
};

const formatAmount = (value: bigint, decimals: number) => {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const scale = BigInt(10) ** BigInt(decimals);
  const whole = absolute / scale;
  const fraction = absolute % scale;
  const fractionStr = fraction.toString().padStart(decimals, "0");
  const trimmedFraction = fractionStr.replace(/0+$/, "");

  const formatted = `${whole.toString()}${trimmedFraction ? `.${trimmedFraction}` : ""}`;
  return negative ? `-${formatted}` : formatted;
};

export default function MarketplacePage() {
  const { address, signTransaction, isPending } = useWallet();
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [tokenMeta, setTokenMeta] = useState<TokenMeta>(defaultTokenMeta);
  const [pendingPurchase, setPendingPurchase] = useState<number | null>(null);
  const [isRefreshing, startTransition] = useTransition();

  const isLoading = state.status === "loading" || state.status === "idle";

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState({ status: "loading" });
      try {
        const [listings, ballsMeta, starsMeta] = await Promise.all([
          fetchMarketplaceListings(),
          fetchBallsMetadata().catch(() => defaultTokenMeta.BALLS),
          fetchStarsMetadata().catch(() => defaultTokenMeta.STARS),
        ]);

        if (!cancelled) {
          setState({ status: "loaded", listings });
          setTokenMeta({
            BALLS: {
              decimals: ballsMeta.decimals ?? defaultTokenMeta.BALLS.decimals,
              symbol: ballsMeta.symbol ?? defaultTokenMeta.BALLS.symbol,
            },
            STARS: {
              decimals: starsMeta.decimals ?? defaultTokenMeta.STARS.decimals,
              symbol: starsMeta.symbol ?? defaultTokenMeta.STARS.symbol,
            },
          });
        }
      } catch (error) {
        console.error("Failed to load marketplace listings", error);
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unable to load marketplace data. Retry shortly.",
          });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const listings = useMemo(() => {
    if (state.status !== "loaded") return [];
    return state.listings;
  }, [state]);

  const refreshListings = () => {
    startTransition(async () => {
      try {
        const data = await fetchMarketplaceListings();
        setState({ status: "loaded", listings: data });
      } catch (error) {
        console.error("Failed to refresh listings", error);
        toast({
          title: "Could not refresh listings",
          description:
            error instanceof Error ? error.message : "Soroban RPC request failed unexpectedly.",
        });
      }
    });
  };

  const handleBuy = async (item: MarketplaceItem) => {
    if (!address) {
      toast({
        title: "Wallet required",
        description: "Connect your Stellar wallet before purchasing an NFT.",
      });
      return;
    }

    if (!signTransaction) {
      toast({
        title: "Missing signer",
        description: "Reconnect your wallet to sign Soroban transactions.",
      });
      return;
    }

    setPendingPurchase(item.tokenId);
    try {
      const client = createGameClient({
        publicKey: address,
        signer: signTransaction,
      });

      const tx = await client.buy_nft({
        buyer: address,
        token_id: item.tokenId,
      });

      const blockers = tx.needsNonInvokerSigningBy?.() ?? [];
      if (blockers.length > 0) {
        throw new Error(
          `Additional signatures required: ${blockers.join(
            ", ",
          )}. Ensure allowances are correctly configured.`,
        );
      }

      const sent = await tx.signAndSend();
      const txHash =
        sent.getTransactionResponse?.txHash ?? sent.sendTransactionResponse?.hash ?? "";

      toast({
        title: "Purchase submitted",
        description: txHash
          ? `Transaction hash: ${txHash}`
          : "NFT purchase transaction submitted.",
        dismissible: true,
      });

      // Refresh listing after purchase attempt
      const [updatedListings] = await Promise.all([
        fetchMarketplaceListings(),
        fetchTeaMetadata(item.tokenId).catch(() => item.metadata),
      ]);
      setState({ status: "loaded", listings: updatedListings });
    } catch (error) {
      console.error(`Failed to buy NFT ${item.tokenId}`, error);
      toast({
        title: "Purchase failed",
        description:
          error instanceof Error
            ? error.message
            : "We could not submit the buy transaction. Check allowances and try again.",
      });
    } finally {
      setPendingPurchase(null);
    }
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-[#fff9f2] via-[#f3ecff] to-[#e9f5ff] pb-28 pt-20">
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(189,140,255,0.18),_transparent_70%)]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-6">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-purple-500 shadow-[0_12px_32px_rgba(189,140,255,0.18)]">
              NFT Marketplace
            </div>
            <div>
              <h1 className="text-4xl font-semibold leading-tight text-slate-800 md:text-5xl">
                Acquire Stellar Tea infusions on-chain
              </h1>
              <p className="mt-3 max-w-3xl text-base text-slate-600 md:text-lg">
                Listings come straight from the deployed game contract. Prices settle in Balls or
                Stars, including protocol fees and burns. Ensure allowances are in place before
                purchasing.
              </p>
            </div>
          </div>
          <Button
            variant="candy"
            onClick={refreshListings}
            disabled={isRefreshing}
            className="h-12 rounded-full px-6 text-xs font-semibold uppercase tracking-[0.26em]"
          >
            {isRefreshing ? "Updating…" : "Refresh"}
          </Button>
        </header>

        <section className="rounded-3xl border border-white/60 bg-white/85 p-8 shadow-[0_35px_85px_rgba(189,140,255,0.22)] backdrop-blur-xl">
          {isLoading ? (
            <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-500">
              Loading on-chain listings…
            </div>
          ) : null}

          {state.status === "error" ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-6 py-5 text-sm text-destructive">
              {state.message}
            </div>
          ) : null}

          {state.status === "loaded" && listings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-12 text-center text-sm text-slate-500">
              No teas are listed right now. Check back later or list one of your NFTs through the
              game contract.
            </div>
          ) : null}

          {state.status === "loaded" && listings.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {listings.map((item) => {
                const priceMeta = tokenMeta[item.listing.paymentToken];
                const price = formatAmount(item.listing.price, priceMeta.decimals);
                const label = paymentTokenLabel(item.listing.paymentToken);
                const isBuying = pendingPurchase === item.tokenId;

                return (
                  <article
                    key={item.tokenId}
                    className="flex h-full flex-col rounded-3xl border border-white/60 bg-white/90 p-5 shadow-[0_28px_70px_rgba(189,140,255,0.18)] backdrop-blur-xl"
                  >
                    <div className="relative overflow-hidden rounded-2xl border border-white/60">
                      <Image
                        src={
                          item.metadata?.image_uri ??
                          item.tokenUri ??
                          "/design/nft/stellar-tea-002.png"
                        }
                        alt={item.metadata?.display_name ?? `Tea #${item.tokenId}`}
                        width={420}
                        height={420}
                        className="h-56 w-full object-cover"
                      />
                      <div className="absolute top-4 left-4 rounded-full border border-white/70 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 shadow-[0_10px_25px_rgba(189,140,255,0.18)]">
                        #{item.tokenId}
                      </div>
                    </div>
                    <div className="mt-5 flex flex-1 flex-col">
                      <h3 className="text-lg font-semibold text-slate-800">
                        {item.metadata?.display_name ?? `Tea #${item.tokenId}`}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.metadata?.flavor_profile ?? item.metadata?.infusion ?? "Custom blend"}
                      </p>

                      <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-[0_15px_35px_rgba(189,140,255,0.16)]">
                        <p className="text-xs uppercase tracking-[0.26em] text-slate-400">
                          Price
                        </p>
                        <p className="mt-1 text-xl font-semibold text-slate-700">
                          {price} {priceMeta.symbol} · {label}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-600">
                        <div className="rounded-2xl border border-white/70 bg-white/80 px-3 py-3 text-center shadow-[0_12px_30px_rgba(189,140,255,0.15)]">
                          <div className="uppercase tracking-[0.22em] text-slate-400">Level</div>
                          <div className="mt-1 text-base font-semibold text-slate-700">
                            {item.metadata?.level ?? 0}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/80 px-3 py-3 text-center shadow-[0_12px_30px_rgba(189,140,255,0.15)]">
                          <div className="uppercase tracking-[0.22em] text-slate-400">Rarity</div>
                          <div className="mt-1 text-base font-semibold text-slate-700">
                            {item.metadata?.rarity ?? 0}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/80 px-3 py-3 text-center shadow-[0_12px_30px_rgba(189,140,255,0.15)]">
                          <div className="uppercase tracking-[0.22em] text-slate-400">Seller</div>
                          <div className="mt-1 font-mono text-xs text-slate-500">
                            {item.listing.seller.slice(0, 4)}…{item.listing.seller.slice(-4)}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="candy"
                        disabled={isBuying || isPending}
                        onClick={() => handleBuy(item)}
                        className="mt-5 h-12 w-full rounded-full text-xs font-semibold uppercase tracking-[0.28em]"
                      >
                        {isBuying ? "Processing…" : "Buy now"}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-white/50 bg-white/75 p-8 shadow-[0_25px_65px_rgba(189,140,255,0.18)] backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-slate-700">Before purchasing</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>
              Grant spending allowance to the game contract for the chosen payment token (Balls or
              Stars) using your wallet.
            </li>
            <li>
              Ensure you retain enough XLM for Soroban fees; the buy transaction collects protocol
              fees and burns automatically.
            </li>
            <li>
              After a successful purchase, the NFT transfers into your wallet and disappears from
              the listing feed.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}


