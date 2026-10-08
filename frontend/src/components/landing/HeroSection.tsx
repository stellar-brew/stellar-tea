import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import heroPrimary from "@/../public/design/images/Layer 6.png";
import heroSecondary from "@/../public/design/images/Layer 7.png";

export const HeroSection = () => {
  return (
    <section className="relative isolate overflow-hidden px-6 pb-24 pt-20 sm:px-10 lg:px-20">
      <div className="absolute inset-0 -z-10">
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="absolute -left-10 top-16 h-72 w-72 rounded-full bg-pink-200/50 blur-3xl animate-float-slow" />
          <div className="absolute bottom-10 right-[-6rem] h-[22rem] w-[22rem] rounded-full bg-purple-200/60 blur-3xl animate-float-delayed" />
        </div>
        <div className="bg-candy-gradient absolute inset-0 opacity-90" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/80 via-white/0 to-transparent" />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col-reverse items-center gap-16 lg:flex-row lg:gap-20">
        <div className="relative flex-1">
          <span className="tag-chip">Web3 Bubble Tea Playground</span>
          <h1 className="mt-6 text-gradient-frost">
            Craft signature teas that live on Stellar
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
            Stellar Tea is the most playful gateway into the Stellar ecosystem.
            Blend bubble tea NFTs with friends, co-sign on Soroban smart
            contracts, and watch your flavor empire grow inside a vibrant
            dual-token economy.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button
              asChild
              variant="candy"
              className="h-12 px-10 text-xs font-semibold uppercase tracking-[0.3em]"
            >
              <Link href="/marketplace">Launch Marketplace</Link>
            </Button>
            <Button
              asChild
              variant="frost"
              className="h-12 px-10 text-xs font-semibold uppercase tracking-[0.3em]"
            >
              <Link href="/docs">View Playbook</Link>
            </Button>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                label: "Marketplace fee",
                value: "3%",
                sub: "2% burned, 1% to treasury on every sale",
              },
              {
                label: "Daily rewards",
                value: "0.02 BALLS + 0.002 STARS",
                sub: "Rate-limited claim enforced on-chain",
              },
              {
                label: "Mixer payout",
                value: "80%",
                sub: "Returned to the losing brewer; 20% to treasury",
              },
            ].map((metric) => (
              <div key={metric.label} className="glass-card p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                  {metric.label}
                </p>
                <p className="mt-3 text-3xl font-semibold text-gradient-frost">
                  {metric.value}
                </p>
                <p className="mt-2 text-xs text-slate-500">{metric.sub}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex-1">
          <div className="absolute -inset-6 rounded-[40px] bg-white/30 blur-3xl" />
          <div className="relative isolate flex flex-col gap-6 rounded-[40px] border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_rgba(168,85,247,0.28)] backdrop-blur-xl">
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-white/80 via-pink-100/60 to-purple-100/60 p-5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.75),transparent_55%)]" />
              <Image
                src={heroPrimary}
                alt="Stellar Tea hero art"
                className="relative rounded-[28px] shadow-[0_16px_45px_rgba(170,95,245,0.25)]"
                priority
              />
            </div>
            <div className="flex items-center gap-4 rounded-[26px] border border-white/60 bg-white/75 p-4 shadow-inner">
              <div className="relative h-20 w-20 overflow-hidden rounded-3xl border border-white/70 shadow-[0_12px_35px_rgba(236,72,153,0.35)]">
                <Image
                  src={heroSecondary}
                  alt="Featured Stellar Tea NFT"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 80px, 120px"
                />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Highlight Drop
                </p>
                <h3 className="mt-1 text-2xl text-slate-800">Galactic Guava</h3>
                <p className="text-sm text-slate-500">
                  Flagship infusion blending aurora guava with star jasmine.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

