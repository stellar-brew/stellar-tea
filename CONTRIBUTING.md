# Contributing to stellar-tea

`stellar-tea` is part of the [stellar-brew](https://github.com/stellar-brew) organisation and is
developed in the open. Contributions of every size are welcome.

## Repository layout

- `contracts/` — five Soroban smart contracts (`game`, `nft-tea`, `tokens/balls`,
  `tokens/stars`, `swap`).
- `frontend/` — the Next.js application that talks to those contracts.
- `packages/` — generated TypeScript contract clients.

## Local setup

Prerequisites: Rust with the `wasm32v1-none` target, Node.js >= 22 and pnpm.

```bash
corepack enable pnpm                  # enable the pinned pnpm (packageManager)
rustup target add wasm32v1-none       # Soroban wasm target
pnpm install                          # install workspace dependencies
pnpm install:contracts                # install and build the generated clients
```

## Finding work

Open tasks are published as bounty issues on the issue tracker:

**-> https://github.com/stellar-brew/stellar-tea/issues**

- Each issue title carries its bounty, for example `[Bounty: $60] Add unit tests for ...`.
- If you are new to the codebase, start with issues labelled `good first issue`.
- Comment on the issue before you begin so it can be assigned to you.

## Tests and checks

Run these from the repository root before opening a pull request:

```bash
cargo test --workspace            # Rust unit tests for every contract
pnpm --filter frontend test       # frontend Vitest suite
pnpm --filter frontend lint       # ESLint for the frontend
pnpm format                       # Prettier
```

## Making the change

1. Fork the repository and branch from the default branch.
2. Keep the change scoped to the issue's acceptance criteria.
3. Run the test, lint and format commands above before you commit.

## Opening a pull request

- Reference the issue in the description, for example `Closes #12`.
- One issue per pull request.
- Make sure CI passes before requesting review.

## Reporting a bug

Open an issue with steps to reproduce, the expected result and the actual result.

## Questions

Ask on the issue thread so the discussion stays alongside the task.
