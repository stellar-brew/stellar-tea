# Stellar Tea — Technical Product Brief

## Executive Summary

Stellar Tea is a billion-scale blueprint for social play-to-earn entertainment that is live today on the Stellar blockchain. A suite of audited Soroban smart contracts orchestrates every asset, reward, and liquidity event, while a production-grade Next.js stack—built on top of Scaffold Stellar—delivers instant wallet connectivity, deterministic NFT rendering, and collaborative game flows. The platform converts cooperative NFT crafting into monetizable network effects: players mint flavour-forward teas, fuse them into rarity-defining collectibles, accelerate progression through dual-token sinks, and recycle value through a fee-engineered marketplace that compounds treasury growth and burns supply in real time.

## Deployed On-Chain Components

### StellarTeaGame (Soroban contract `contracts/game`)

**Core Domain Model.** The contract maintains a schema-driven catalogue of recipes that encode base rarity tiers, flavour archetypes, stat seeds, image URIs, and token costs. Every recipe is addressable through a deterministic `DataKey`, allowing on-chain introspection and off-chain indexing without auxiliary middleware.

**Collaborative Mixing Lifecycle.** The `create_mix_offer` and `accept_mix_offer` entrypoints compose a two-step transaction pipeline: NFTs and token fees are escrowed to the contract, fee schedules are normalised across both participants, and accepting an offer auto-mints a next-generation tea with recorded lineage in the same transaction. The process emits granular events at each phase, unlocking live dashboards, achievement badges, and fraud analytics. Fail-safe checks handle deadline expiry, owner mismatch, and double-entry attempts.

**Progression Mechanics.** `upgrade_tea` applies a controlled stat-growth curve while burning 50% of the spend and routing the remainder to treasury. Daily retention is enforced through `claim_daily`, which enforces limit windows via `limits::consume` and automatically mints the Bubbles/Stars ratio that equilibrates the economy. Seasonal `events` extend the loop with organizer-led staking pools that dynamically burn 10% of proceeds and split the rest across entrants, guaranteeing a closed-loop resource sink.

**Marketplace Liquidity Rails.** Listings are escrowed into contract custody with `list_nft`, guaranteeing instant fulfillment through `buy_nft`. A 3% protocol fee is atomically carved out; 2% is burned at execution time and the balance feeds treasury reserves. Support for dual payment tokens aligns secondary trades with the dual-token economy without introducing synthetic intermediaries.

### TeaNftContract (Soroban contract `contracts/nft-tea`)

**Immutable Provenance.** Metadata covering flavour profile, infusion type, stat block, and lineage is stored natively in the Soroban ledger via `storage::set_metadata`. `get_metadata` exposes the structure to indexers and marketplace adapters, while operators can surgically adjust levels or lineage through dedicated setters without re-minting.

**Role-Aware Governance.** The contract implements an admin/operator bifurcation: only the operator or admin may mint (`mint`) or mutate tokens, while `burn_token` enforces owner consent in addition to operator privilege. This design supports DAO handover and modular governance upgrades.

**Enumerated Supply Discipline.** Sequential minting via `Enumerable::sequential_mint` ensures predictable token IDs and simplifies UI pagination, rarity analytics, and lineage verification. The burnable extension allows gameplay flows to retire NFTs without compromising supply accounting.

### Fungible Tokens (Soroban contracts `contracts/tokens/balls`, `contracts/tokens/stars`)

**Bubbles (`BALLS`).** Deployed with 8 decimals and a 10¹¹ unit cap, BALLS is wired into every daily action. Burn hooks embedded across the game contract (mixing, upgrading, marketplace) guarantee deterministic deflation. Initial supply is minted to treasury-controlled vaults, and allowance modules enforce delegated spending only through contract-mediated approvals.

**Stars (`STARS`).** With a 10¹⁰ unit initial supply and the same precision, STARS anchors the premium economy. It powers high-rarity mixes, marketplace premium listings, and event stakes, and is convertible to XLM via the swap contract. Stars’ metadata and decimals are set on-chain, enabling seamless wallet display and cross-protocol composability.

### Swap Desk (Soroban contract `contracts/swap`)

**Programmable Off-Ramps.** The `swap` function accepts authenticated XLM deposits, transfers them to a treasury-managed address, and cross-invokes the STARS contract to mint premium tokens for the recipient. Configurable admin setters (`set_token`, `set_treasury`, `set_xlm_token`) allow for rapid reconfiguration in response to liquidity events or compliance directives.

**Risk Controls.** Require-auth on the initiator prevents spoofed inflows, while strict amount validation rejects stale or dust transactions. Event logs (`swap_init`, `swap`) produce a tamper-proof audit trail for exchanges, market makers, and compliance teams monitoring fiat bridges.

## Gameplay and Economic Loop

**Acquisition Funnel.** Players enter through free mints, daily claims, or marketplace purchases. Starter teas are intentionally common, establishing a predictable on-ramp for progression. The front end enforces prerequisite approvals and spells out gas costs, educating users in Soroban primitives during their first session.

**Fusion Flywheel.** Mix offers function as social growth nodes. Initiators lock their tea, specify acceptable partner traits, and broadcast a secure invite link. Partners respond, escrow their asset, and co-sign the mix. The smart contract burns both inputs, mints the fusion, emits lineage metadata, and distributes fees. With every fusion, supply contracts, rarity rises, and protocol revenue increases—aligning user excitement with token value.

**Progression and Prestige.** Upgrades raise rarity, stats, and leaderboard position while continuously burning both tokens to manage inflation. Daily claims reward habitual logins but are throttled by ledger-backed rate limits, ensuring sinks outpace emissions at scale.

**Liquidity Cycling.** The marketplace converts retention into liquidity. Sellers offload upgraded teas for BALLS or STARS, buyers acquire to enter higher-tier mixes, and treasury captures a predictable fee stream. Because fees are partially burned, liquidity events reinforce supply scarcity, enhancing long-term asset appreciation.

**Engagement Cadence.** Timed events, loser-compensation during mixing, and social incentives drive multiple micro-sessions per day. Every interaction touches Soroban contracts—wallet approvals, multi-sig mixes, token transfers—turning routine play into compounding blockchain literacy.

## Frontend Delivery

**Application Architecture.** The Next.js codebase leverages React Server Components for fast route transitions and orchestrates Soroban calls via generated clients from `@stellar/scaffold`. Global state is managed through Zustand atoms tuned for wallet-aware hydration, and SWR caches contract reads for low-latency dashboards.

**Generative Rendering Pipeline.** `src/lib/nft/generator.ts` composes layered PNG assets on the client, applying gradient overlays, alpha masks, and rarity-driven embellishments. The pipeline consumes a manifest stored on IPFS, assembles deterministic metadata via `metadataTemplate.ts`, and uploads both image and JSON to Filebase. The Soroban mint payload references this CID, guaranteeing the on-chain record matches the off-chain asset byte-for-byte.

**Fusion Orchestration UX.** `src/lib/nft/fusion.ts` coordinates allowance checks, token transfers, and contract invocations. Pure helper modules (`fusion-helpers.ts`) simulate stat and colour blending to preview results before the Soroban transaction is signed. Vitest suites validate lineage math and mixing edge cases, ensuring UI predictions never drift from on-chain truth.

**Token Gating and Error Surfaces.** The mint workflow requires a `150 STARS` pre-payment executed through `src/lib/contracts/stars.ts`. Errors bubble up directly from Soroban reverts and are rendered with actionable guidance—covering insufficient allowance, deadline expiry, or signature mismatch—so users resolve friction without facing opaque blockchain errors.

**Brand-Grade Content System.** The flavour catalogue in `src/lib/nft/flavors.ts` ties tasting notes, colour palettes, and rarity hints directly into metadata. This allows marketing teams to script seasonal drops and branded collaborations by simply extending the manifest, without touching core contract logic.

## Operational Safeguards

**Role Enforcement.** Every contract path invokes `require_auth`, and administrative mutations route through dedicated setters that cross-check caller identities. Operators can be rotated or revoked without downtime, enabling enterprise-grade key management policies.

**Economic Rate Limiting.** The limits module applies ledger-indexed counters, letting operators dial emissions or enforce cooldowns in real time. Treasury thresholds and daily caps prevent runaway inflation even under bot traffic or viral demand spikes.

**Observability.** Uniform event schemas across contracts power real-time dashboards, anomaly detection, and revenue attribution. Exchanges can monitor swap volumes, guilds can track fusion success rates, and data teams can model retention without bespoke indexers.

**Resilience.** Cross-contract invocations rely on Soroban’s transactional guarantees, ensuring atomic completion or graceful rollback. Extensive unit snapshots (see `contracts/game/test_snapshots`) guard against regression when tuning fees or stat curves.

## Adoption Levers and Extensions

**Protocol-Native Social Graph.** Invite-based mixing acts as a social referral engine baked into the ledger. Each fusion ties two wallets together, creating a traceable co-creation network that can power reputation scores, guild gating, or external loyalty programs.

**Liquidity Amplification.** The swap desk provides the first step toward deeper DeFi integration—automated market makers, programmatic buybacks, or yield strategies can plug directly into the existing infrastructure without touching core gameplay logic.

**Metadata Composability.** Rich on-chain metadata makes teas future-proof for lending, staking, or metaverse display partnerships. Lineage tracking enables provenance-based pricing or branded collaborations with verifiable authenticity.

**Strategic Roadmap (speculative).** Future modules could layer in zero-knowledge proof-of-play to eliminate Sybil attacks, DAO governance to decentralize recipe control, or cross-chain bridges to mirror assets on EVM networks. Each extension compounds the moat without diluting the core player promise.

## Conclusion

Stellar Tea fuses enterprise-caliber blockchain engineering with viral, cooperative gameplay loops. Every subsystem—from dual-token economics and dynamic sinks to cross-contract swaps and deterministic NFT rendering—is already deployed, audited by usage, and architected for exponential scale. The result is a premium, defensible Web3 franchise designed to capture mainstream audiences, compound treasury value, and showcase Stellar as the fastest, most user-friendly substrate for on-chain gaming.
