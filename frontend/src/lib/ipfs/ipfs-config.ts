const DEFAULT_API_ENDPOINT = "https://ipfs.filebase.io/api/v1";
const DEFAULT_GATEWAY_URL = "https://ipfs.filebase.io";

export interface IPFSClientConfig {
  host: string;
  port: number;
  protocol: "http" | "https";
  apiPath: string;
  headers: Record<string, string>;
}

const readEnv = (key: string): string | undefined => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : undefined;
};

const parseEndpoint = (endpoint: string) => {
  const url = new URL(endpoint);
  const protocol = url.protocol === "http:" ? "http" : "https";
  const port = url.port ? Number(url.port) : protocol === "https" ? 443 : 80;
  const apiPath = url.pathname.replace(/\/$/, "") || "/";
  return { host: url.hostname, port, protocol, apiPath };
};

/**
 * Builds the options object consumed by `ipfs-http-client`'s `create()`.
 * Filebase authenticates with a Basic token, so the documented
 * `NEXT_PUBLIC_IPFS_API_KEY` is sent as an Authorization header.
 */
export const getIPFSClientConfig = (): IPFSClientConfig => {
  const apiKey = readEnv("NEXT_PUBLIC_IPFS_API_KEY");

  if (!apiKey) {
    throw new Error(
      "NEXT_PUBLIC_IPFS_API_KEY is not set. Add a Filebase IPFS API token to frontend/.env.local before uploading.",
    );
  }

  const endpoint = readEnv("NEXT_PUBLIC_IPFS_API_ENDPOINT") ?? DEFAULT_API_ENDPOINT;
  const { host, port, protocol, apiPath } = parseEndpoint(endpoint);

  return {
    host,
    port,
    protocol,
    apiPath,
    headers: {
      Authorization: `Basic ${apiKey}`,
    },
  };
};

/**
 * Resolves a CID (or an existing `ipfs://` URI) to a public gateway URL using
 * `NEXT_PUBLIC_IPFS_GATEWAY_URL`, defaulting to the Filebase gateway.
 */
export const getIPFSUrl = (cid: string): string => {
  const gateway = (
    readEnv("NEXT_PUBLIC_IPFS_GATEWAY_URL") ?? DEFAULT_GATEWAY_URL
  ).replace(/\/$/, "");
  const path = cid.startsWith("ipfs://") ? cid.slice("ipfs://".length) : cid;
  return `${gateway}/ipfs/${path}`;
};
