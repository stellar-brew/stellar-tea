import { FlaskConical, Sparkles, UsersRound } from "lucide-react";

const features = [
  {
    title: "Collect radiant NFT teas",
    description:
      "Every brew lives on-chain with rarity DNA, ingredient lineage, and tasting notes secured by Soroban smart contracts.",
    metric: "53 base flavors",
    icon: Sparkles,
  },
  {
    title: "Co-create fusion recipes",
    description:
      "List your tea for mixing, share the invite, and co-sign a multi-party transaction to mint exclusive fusions together.",
    metric: "2-player multi-sig flow",
    icon: UsersRound,
  },
  {
    title: "Showcase immersive lounges",
    description:
      "Design virtual tea houses, stream tastings, and attract collectors with seasonal décor and leaderboard challenges.",
    metric: "Dynamic social hubs",
    icon: FlaskConical,
  },
];

export const FeatureHighlights = () => {
  return (
    <section className="relative mx-auto mt-6 max-w-6xl px-6 sm:px-10 lg:px-20">
      <div className="glass-card overflow-hidden p-12 lg:p-16">
        <div className="absolute -left-20 top-10 h-48 w-48 rounded-full bg-pink-200/45 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-40 w-40 rounded-full bg-purple-200/55 blur-3xl" />

        <div className="relative flex flex-col gap-14">
          <header className="max-w-3xl">
            <span className="tag-chip">Core Gameplay Loop</span>
            <h2 className="mt-5 text-slate-900">
              A playful path from collection to collaboration
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              Stellar Tea combines collectible depth with effortless co-op
              mechanics. Blend flavors, master your inventory, and keep your
              tea club buzzing with every on-chain action.
            </p>
          </header>

          <div className="grid gap-8 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="soft-panel relative overflow-hidden"
              >
                <div className="absolute -top-10 right-6 h-24 w-24 rounded-full bg-white/60 blur-2xl" />
                <feature.icon
                  className="h-10 w-10 text-pink-500"
                  strokeWidth={1.4}
                />
                <h3 className="mt-6 text-xl text-slate-900">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {feature.description}
                </p>
                <p className="mt-6 inline-flex items-center rounded-full bg-pink-200/40 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-pink-700">
                  {feature.metric}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

