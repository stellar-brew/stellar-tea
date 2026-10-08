import Image from "next/image";

import socialVisual from "@/../public/design/images/Layer 4.png";

const socialPillars = [
  {
    heading: "Co-op mixing",
    copy: "Mix offers are the social core: lock a tea, invite a partner by address, and co-sign a transaction that mints a fusion with recorded lineage.",
    stat: "Two wallets linked on-chain per fusion",
  },
  {
    heading: "Lineage provenance",
    copy: "Every fusion records its parent token ids on-chain, giving your collection a verifiable provenance trail for the marketplace.",
    stat: "Parent token ids stored in metadata",
  },
  {
    heading: "Event staking",
    copy: "Organizer-led event pools let players stake STARS together; when the event finishes 10% is burned and the rest is shared out.",
    stat: "10% burned, 90% distributed",
  },
];

export const SocialSection = () => {
  return (
    <section className="relative mt-24 px-6 sm:px-10 lg:px-20">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[40px] border border-white/60 bg-white/78 shadow-[0_28px_75px_rgba(178,132,255,0.22)] backdrop-blur-2xl">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative p-10 lg:p-16">
            <span className="tag-chip">Social-first design</span>
            <h2 className="mt-6 text-slate-900">
              Build a fandom that returns for the people and the pours
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              Stellar Tea bakes collaboration into every layer: every fusion links
              two wallets on-chain, so playing together is part of the game loop
              rather than a bolt-on.
            </p>

            <div className="mt-10 space-y-8">
              {socialPillars.map((pillar) => (
                <div key={pillar.heading} className="soft-panel bg-white/85">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-pink-500">
                    {pillar.heading}
                  </p>
                  <p className="mt-3 text-sm text-slate-600">{pillar.copy}</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-purple-600">
                    {pillar.stat}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-100/60 via-white/70 to-purple-100/60" />
            <div className="relative flex h-full items-end justify-center p-10 lg:p-16">
              <div className="relative w-full overflow-hidden rounded-[32px] border border-white/60 bg-white/85 shadow-[0_22px_65px_rgba(189,140,255,0.3)]">
                <Image
                  src={socialVisual}
                  alt="Social experience inside Stellar Tea"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

