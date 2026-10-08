#!/usr/bin/env node
/**
 * Fails the build when a `workspace:*` dependency declared by the frontend
 * cannot be resolved to a real package directory under `packages/`.
 *
 * The frontend depends on generated Soroban clients that live in the pnpm
 * workspace (`packages/<name>`). If a client is renamed, deleted, or never
 * generated, `workspace:*` silently points at a package that does not exist
 * and the failure only surfaces later during `next build`.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = join(repoRoot, "frontend", "package.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const declared = {
  ...(manifest.dependencies ?? {}),
  ...(manifest.devDependencies ?? {}),
};

const workspaceDeps = Object.entries(declared)
  .filter(([, spec]) => typeof spec === "string" && spec.startsWith("workspace:"))
  .map(([name]) => name)
  .sort();

const missing = workspaceDeps.filter(
  (name) => !existsSync(join(repoRoot, "packages", name, "package.json")),
);

if (missing.length > 0) {
  console.error(
    "::error::Unresolved workspace dependencies declared in frontend/package.json:",
  );
  for (const name of missing) {
    console.error(`  - ${name}: no packages/${name}/package.json found`);
  }
  process.exit(1);
}

console.log(
  `All ${workspaceDeps.length} workspace dependencies resolve: ${workspaceDeps.join(", ")}`,
);
