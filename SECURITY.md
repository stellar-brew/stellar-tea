# Security Policy

## Supported Versions

The Soroban contracts in this repository are pre-1.0 (`0.0.1`) and are deployed to
the Stellar **Testnet** only. There is currently no supported Mainnet deployment.

| Component | Path | Supported |
| --- | --- | --- |
| StellarTeaGame | `contracts/game` | Testnet |
| TeaNftContract | `contracts/nft-tea` | Testnet |
| BALLS token | `contracts/tokens/balls` | Testnet |
| STARS token | `contracts/tokens/stars` | Testnet |
| Swap | `contracts/swap` | Testnet |

Security fixes are applied to the `main` branch. Older commits and branches are not
maintained.

## Scope

In scope:

- The Soroban contracts under `contracts/` (game logic, NFT, tokens, swap).
- Wallet connection, signing and transaction-building code under `frontend/src/`.
- The generated contract clients under `packages/`.
- CI and release configuration under `.github/`.

Out of scope:

- Third-party dependencies (report those upstream).
- The Stellar network, the Soroban host and the Stellar CLI themselves.
- Findings that require a compromised developer machine or leaked local keys.

## Reporting a Vulnerability

Please report suspected vulnerabilities privately through GitHub Security
Advisories for this repository (`Security` -> `Report a vulnerability`). Do **not**
open a public issue for a security problem.

Include, where you can:

- A description of the issue and its impact.
- Steps or a proof of concept to reproduce it.
- The affected contract, file or endpoint.
- Any suggested remediation.

If you cannot use GitHub, contact the maintainers through the
[stellar-brew](https://github.com/stellar-brew) organisation profile.

## Response Expectations

- Acknowledgement of a report within **3 business days**.
- An initial assessment (confirmed / not a vulnerability / needs more information)
  within **10 business days**.
- A fix or mitigation plan for confirmed issues as soon as is practical, with the
  reporter kept informed until disclosure.

Please give us a reasonable window to remediate before any public disclosure. We
will credit reporters who wish to be acknowledged.

## Handling Secrets

Never commit secret keys or seed phrases. If a key is exposed, rotate it
immediately and report the exposure through the channel above.

## Known Limitations

This policy describes expectations for maintainers and reporters; it is not
enforced automatically. The CI workflow at `.github/workflows/node.yml` builds and
tests the project but does not run secret scanning or a security-policy gate.
