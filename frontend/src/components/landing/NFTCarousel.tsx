"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

const nftItems = [
  {
    name: "Aurora Lychee Swirl",
    flavor: "Lychee • Moonlit Hibiscus • Crystal Tapioca",
    rarity: "Mythic Fusion",
    yield: "Records parent lineage on-chain",
    image: "/design/nft/stellar-tea-001.png",
  },
  {
    name: "Nebula Peach Cream",
    flavor: "White Peach • Cosmic Cream • Prism Jelly",
    rarity: "Legendary Seasonal",
    yield: "Tradeable on the custodial marketplace",
    image: "/design/nft/stellar-tea-002.png",
  },
  {
    name: "Galactic Ube Frost",
    flavor: "Ube • Starlight Vanilla • Aurora Pearls",
    rarity: "Founder Reserve",
    yield: "Eligible for co-op mixing offers",
    image: "/design/nft/stellar-tea-003.png",
  },
];

export const NFTCarousel = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % nftItems.length);
    }, 5200);
    return () => clearInterval(timer);
  }, []);

  const activeItem = useMemo(() => nftItems[activeIndex], [activeIndex]);

  return (
    <section className="relative mt-24 px-6 sm:px-10 lg:px-20">
      <div className="mx-auto max-w-6xl rounded-[40px] bg-gradient-to-br from-white/75 via-pink-100/60 to-purple-100/70 p-10 shadow-[0_28px_80px_rgba(189,140,255,0.28)] backdrop-blur-2xl lg:p-16">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-center">
          <div className="flex-1">
            <span className="tag-chip">Signature NFT Series</span>
            <h2 className="mt-6 text-slate-900">
              Showcase bubble teas that collectors can mint, mix and trade
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              Every Stellar Tea NFT is rendered in the browser from layered
              assets and carries on-chain metadata with its rarity, stats and
              lineage. Display it in your collection, trade it on the
              marketplace, or mix it into the next rarity tier.
            </p>
            <div className="mt-10 grid gap-6">
              <div className="rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-[0_18px_45px_rgba(189,140,255,0.22)]">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  {activeItem.rarity}
                </p>
                <h3 className="mt-3 text-2xl text-gradient-frost">
                  {activeItem.name}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {activeItem.flavor}
                </p>
                <p className="mt-4 inline-flex rounded-full bg-purple-200/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-purple-700">
                  {activeItem.yield}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  className="rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 px-6 text-xs font-semibold uppercase tracking-[0.28em]"
                >
                  <Link href="/mint">Mint This Drop</Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="text-xs font-semibold uppercase tracking-[0.28em] text-purple-500 hover:bg-purple-100/50"
                >
                  <Link href="/marketplace">View Rarity Guide</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="relative mx-auto max-w-[380px]">
              <div className="absolute -inset-6 rounded-[40px] bg-pink-200/40 blur-3xl animate-glow" />
              <div className="relative rounded-[36px] border border-white/70 bg-white/90 p-5 shadow-[0_26px_60px_rgba(189,140,255,0.28)] backdrop-blur-2xl">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] border border-purple-100 bg-gradient-to-br from-white via-purple-50/40 to-pink-50/60 shadow-[0_18px_45px_rgba(170,95,245,0.22)]">
                  <Image
                    key={activeItem.image}
                    src={activeItem.image}
                    alt={activeItem.name}
                    fill
                    className="object-contain transition-all duration-700"
                    sizes="(max-width: 1024px) 90vw, 380px"
                  />
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-center gap-4">
              {nftItems.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border bg-white/70 transition ${
                    activeIndex === index
                      ? "border-pink-400 shadow-[0_12px_30px_rgba(236,72,153,0.25)]"
                      : "border-white/70 opacity-70 hover:opacity-100"
                  }`}
                  aria-label={`Preview ${item.name}`}
                  aria-pressed={activeIndex === index}
                >
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-contain"
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

