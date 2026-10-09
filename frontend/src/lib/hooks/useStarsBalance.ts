"use client";

import { useCallback, useEffect, useState } from "react";

import { createStarsClient } from "@/lib/contracts/stars";
import { extractSorobanErrorMessage } from "@/lib/util/soroban";
import { formatTokenAmount } from "@/lib/util/tokenMath";

type State = {
  raw: bigint;
  formatted: string;
  decimals: number;
  isLoading: boolean;
  error: string | null;
};

const INITIAL_STATE: State = {
  raw: BigInt(0),
  formatted: "0",
  decimals: 8,
  isLoading: false,
  error: null,
};

const unwrapResult = (value: unknown): bigint => {
  if (typeof value === "bigint") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "unwrap" in value &&
    typeof (value as { unwrap: unknown }).unwrap === "function"
  ) {
    try {
      return (value as { unwrap: () => bigint }).unwrap();
    } catch (error) {
      console.error("Failed to unwrap contract result", error);
    }
  }

  return BigInt(0);
};

export const STARS_BALANCE_REFRESH_EVENT = "stars-balance-refresh";

export const useStarsBalance = (address?: string | null) => {
  const [state, setState] = useState<State>(INITIAL_STATE);

  const fetchBalance = useCallback(async () => {
    if (!address) {
      setState(INITIAL_STATE);
      return;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const client = await createStarsClient();
      const { result: metadataResult } = await client.metadata();
      const [decimals] = metadataResult ?? [INITIAL_STATE.decimals, "", ""];

      const { result: balanceResult } = await client.balance({ id: address });
      const raw = unwrapResult(balanceResult);

      setState({
        raw,
        decimals,
        formatted: formatTokenAmount(raw, Number(decimals)),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error(error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: extractSorobanErrorMessage(
          error,
          "Unable to fetch STARS balance.",
        ),
      }));
    }
  }, [address]);

  useEffect(() => {
    void fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = () => {
      void fetchBalance();
    };

    window.addEventListener(STARS_BALANCE_REFRESH_EVENT, handler);
    return () => window.removeEventListener(STARS_BALANCE_REFRESH_EVENT, handler);
  }, [fetchBalance]);

  return {
    ...state,
    refresh: fetchBalance,
  };
};

