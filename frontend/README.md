## Stellar Tea Frontend

Generative NFT tooling for the Stellar Tea experience is implemented in this app:

- Browser-side compositing of PNG layers and gradient overlays
- IPFS uploads (Filebase) for rendered PNG + JSON metadata
- Fusion helpers for mixing teas and minting through the Soroban contracts

## Requirements

- Node 20+
- pnpm 8+ (`corepack enable pnpm`)
- Installed workspace dependencies (`pnpm install`)

## Environment Variables

Create `.env.local` in `frontend/` with:

```bash
# Soroban / IPFS
NEXT_PUBLIC_IPFS_API_KEY=<Filebase basic token, e.g. MTJ...>
NEXT_PUBLIC_IPFS_API_ENDPOINT=https://ipfs.filebase.io/api/v1   # optional override
NEXT_PUBLIC_IPFS_GATEWAY_URL=https://ipfs.filebase.io           # optional override

# Mint fee destination (optional; defaults to the tea NFT contract, whose admin
# can recover held STARS through the contract's `sweep` entrypoint)
NEXT_PUBLIC_TEA_MINT_FEE_DESTINATION=<treasury or fee address>
```

## Commands

```bash
pnpm dev       # start the Next.js dev server
pnpm lint      # eslint check
pnpm test      # vitest unit tests for fusion helpers
```

## Generative Workflow

1. Place PNG/SVG layers under `public/nft/generate` (already bundled in the repo).
2. Press the single mint button on `/mint`:
   - the app randomly samples layers + flavour swatch
   - pays **150 STARS** to the configured fee destination (the tea contract by
     default, whose admin can recover it with `sweep`)
   - renders a 485×1000 PNG in the browser
   - uploads PNG + metadata JSON to Filebase IPFS
   - signs the Soroban mint transaction (`tea-nft`)
3. Inspect the minted result in the on-chain collection or game contract.

## Flavours & Metadata

- `src/lib/nft/flavors.ts` — palette of 53 saturated colours with flavour names and tasting notes.
- `src/lib/nft/metadataTemplate.ts` — helper that assembles titles, descriptions and infusions from the selected swatch.
- `src/lib/nft/generator.ts` + `src/lib/nft/generateLocal.ts` — compose layers (base PNGs, SVG mask, topping, frame, highlights).
- `src/lib/contracts/stars.ts` — handles the 150 STARS transfer before minting.

## Project Structure

- `src/lib/nft/schema.ts` – metadata schema + builder helpers.
- `src/lib/nft/generator.ts` – canvas renderer for layers and gradients.
- `src/lib/nft/fusion-helpers.ts` – pure color/stat lineage helpers (tested).
- `src/lib/nft/fusion.ts` – full fusion pipeline, including Soroban mint call.
- `src/lib/ipfs/client.ts` – Filebase IPFS uploads (Blob + JSON).
- `src/app/mint/page.tsx` – однокнопочный базовый минт (случайная генерация, загрузка, Soroban).

## Tests

Unit tests use [Vitest](https://vitest.dev). Run `pnpm test` to validate color blending, lineage, and metadata helpers. The suite does not touch the DOM.

