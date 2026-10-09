"use client";

import { useCallback, useEffect } from "react";

import { toast } from "@/components/ui/use-toast";
import type { ToastVariant } from "@/components/ui/toast";

type Listener = (payload: GameNotificationPayload) => void;

const listeners = new Set<Listener>();

export type GameNotificationPayload = {
  title?: string;
  description: string;
  variant?: ToastVariant;
  dismissible?: boolean;
};

export const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

type NotificationOverrides = Omit<GameNotificationPayload, "description" | "variant">;

export const useGameNotifications = () => {
  const notify = useCallback(
    (payload: GameNotificationPayload) => {
      toast({
        title: payload.title,
        description: payload.description,
        dismissible: payload.dismissible ?? true,
        variant: payload.variant,
      });
    },
    [],
  );

  const success = useCallback(
    (description: string, overrides?: NotificationOverrides) =>
      notify({
        description,
        variant: "success",
        ...overrides,
      }),
    [notify],
  );

  const info = useCallback(
    (description: string, overrides?: NotificationOverrides) =>
      notify({
        description,
        variant: "info",
        ...overrides,
      }),
    [notify],
  );

  const warning = useCallback(
    (description: string, overrides?: NotificationOverrides) =>
      notify({
        description,
        variant: "warning",
        ...overrides,
      }),
    [notify],
  );

  const error = useCallback(
    (description: string, overrides?: NotificationOverrides) =>
      notify({
        description,
        variant: "destructive",
        ...overrides,
      }),
    [notify],
  );

  return {
    notify,
    success,
    info,
    warning,
    error,
  };
};

export const useGameNotificationBus = () => {
  const { notify } = useGameNotifications();

  useEffect(() => subscribe(notify), [notify]);
};

export const GameNotificationBridge = () => {
  useGameNotificationBus();
  return null;
};

