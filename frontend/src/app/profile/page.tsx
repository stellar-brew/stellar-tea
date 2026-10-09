"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { TeaCard } from "@/components/nft/tea-card";
import { toast } from "@/components/ui/use-toast";
import { useWallet } from "@/lib/hooks/useWallet";
import {
  type OwnedTeaToken,
  fetchOwnedTeaTokens,
} from "@/lib/contracts/nft";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; tokens: OwnedTeaToken[] }
  | { status: "error"; message: string };

const emptyState: LoadState = { status: "idle" };


export default function ProfilePage() {
  const { address } = useWallet();
  const [state, setState] = useState<LoadState>(emptyState);
  const [isRefreshing, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    if (!address) {
      return;
    }

    const load = async () => {
      setState({ status: "loading" });
      try {
        const tokens = await fetchOwnedTeaTokens(address);
        if (!cancelled) {
          setState({ status: "loaded", tokens });
        }
      } catch (error) {
        console.error("Failed to load profile NFTs", error);
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Could not fetch owned NFTs. Try again later.",
          });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [address]);

  const summary = useMemo(() => {
    if (state.status !== "loaded") return { total: 0, highestLevel: 0 };
    const { tokens } = state;
    const highest = tokens.reduce(
      (acc, token) => Math.max(acc, token.metadata?.level ?? 0),
      0,
    );
    return {
      total: tokens.length,
      highestLevel: highest,
    };
  }, [state]);

  const handleRefresh = () => {
    if (!address) return;
    startTransition(async () => {
      try {
        const tokens = await fetchOwnedTeaTokens(address);
        setState({ status: "loaded", tokens });
      } catch (error) {
        console.error("Refresh failed", error);
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to refresh NFT portfolio. Please retry.",
        });
      }
    });
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-[#fff7f0] via-[#f4ecff] to-[#eaf4ff] pb-28 pt-20">
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(189,140,255,0.18),_transparent_70%)]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-6">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-purple-500 shadow-[0_12px_32px_rgba(189,140,255,0.18)]">
              Player Profile
            </div>
            <div>
              <h1 className="text-4xl font-semibold leading-tight text-slate-800 md:text-5xl">
                Your Stellar Tea collection
              </h1>
              <p className="mt-3 max-w-2xl text-base text-slate-600 md:text-lg">
                Review the teas you currently own, their infusion stats, and rarity levels.
                Listings and upgrades sync directly with the deployed NFT contracts.
              </p>
            </div>
          </div>
          <Button
            variant="candy"
            disabled={!address || isRefreshing}
            onClick={handleRefresh}
            className="h-12 rounded-full px-6 text-xs font-semibold uppercase tracking-[0.26em]"
          >
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </header>

        {!address ? (
          <section className="rounded-3xl border border-white/60 bg-white/85 p-10 text-center shadow-[0_30px_70px_rgba(189,140,255,0.22)] backdrop-blur-xl">
            <h2 className="text-2xl font-semibold text-slate-700">
              Connect your wallet to view the collection
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              Use the “Connect Wallet” button in the header. Once connected, we will query the
              deployed Tea NFT contract and display the assets held by your address.
            </p>
          </section>
        ) : null}

        {address ? (
          <section className="flex flex-col gap-6 rounded-3xl border border-white/60 bg-white/85 p-8 shadow-[0_35px_85px_rgba(189,140,255,0.22)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-700">Portfolio summary</h2>
                <p className="text-sm text-slate-500">
                  Address:{" "}
                  <span className="font-mono text-slate-700">
                    {address.slice(0, 6)}…{address.slice(-6)}
                  </span>
                </p>
              </div>
              <div className="flex gap-6 text-sm md:text-base">
                <div className="rounded-2xl border border-purple-200 bg-purple-50/70 px-6 py-4 text-purple-700 shadow-[0_12px_35px_rgba(189,140,255,0.18)]">
                  <p className="text-xs uppercase tracking-[0.28em] text-purple-500">Total</p>
                  <p className="mt-1 text-2xl font-semibold">{summary.total}</p>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 px-6 py-4 text-blue-700 shadow-[0_12px_35px_rgba(135,176,255,0.18)]">
                  <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Highest level</p>
                  <p className="mt-1 text-2xl font-semibold">{summary.highestLevel}</p>
                </div>
              </div>
            </div>

            {state.status === "loading" ? (
              <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
                Fetching NFTs from chain…
              </div>
            ) : null}

            {state.status === "error" ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-6 py-5 text-sm text-destructive">
                {state.message}
              </div>
            ) : null}

            {state.status === "loaded" && state.tokens.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-10 text-center text-sm text-slate-500">
                No NFTs detected for this wallet yet. Mint or acquire teas in the marketplace to
                see them here.
              </div>
            ) : null}

            {state.status === "loaded" && state.tokens.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {state.tokens.map((token) => (
                  <TeaCard
                    key={token.tokenId}
                    data={{
                      tokenId: token.tokenId,
                      chainMetadata: token.metadata,
                      offchainMetadata: token.offchainMetadata ?? null,
                      imageUri: token.offchainMetadata?.image ?? token.metadata?.image_uri ?? token.tokenUri,
                      tokenUri: token.tokenUri,
                    }}
                    onList={() =>
                      toast({
                        title: "Listing coming soon",
                        description: `Listing tea #${token.tokenId} for sale is not available yet.`,
                      })
                    }
                    onMix={() =>
                      toast({
                        title: "Fusion coming soon",
                        description: `Sending tea #${token.tokenId} for fusion is not available yet.`,
                      })
                    }
                  />
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}


