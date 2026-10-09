import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GameNotificationPayload } from "@/lib/game/notifications";

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
}));

vi.mock("@/components/ui/use-toast", () => ({ toast: mocks.toast }));

// The bus helpers are plain functions; stubbing React's hooks lets us call
// `useGameNotifications()` directly without a rendering library.
vi.mock("react", () => ({
  useCallback: <T>(callback: T) => callback,
  useEffect: () => undefined,
}));

import {
  emitGameNotification,
  subscribe,
  useGameNotifications,
} from "@/lib/game/notifications";

type Listener = (payload: GameNotificationPayload) => void;

describe("game notification bus", () => {
  const cleanups: Array<() => void> = [];

  const track = (listener: Listener) => {
    const unsubscribe = subscribe(listener);
    cleanups.push(unsubscribe);
    return unsubscribe;
  };

  afterEach(() => {
    while (cleanups.length > 0) {
      cleanups.pop()?.();
    }
  });

  it("delivers an emitted payload to every active listener", () => {
    const first = vi.fn<Listener>();
    const second = vi.fn<Listener>();
    track(first);
    track(second);

    const payload: GameNotificationPayload = {
      description: "A brew finished",
      variant: "info",
    };
    emitGameNotification(payload);

    expect(first).toHaveBeenCalledWith(payload);
    expect(second).toHaveBeenCalledWith(payload);
  });

  it("stops delivery to exactly the unsubscribed listener", () => {
    const keep = vi.fn<Listener>();
    const drop = vi.fn<Listener>();
    track(keep);
    const unsubscribe = track(drop);

    emitGameNotification({ description: "first" });
    expect(keep).toHaveBeenCalledTimes(1);
    expect(drop).toHaveBeenCalledTimes(1);

    unsubscribe();
    emitGameNotification({ description: "second" });

    expect(keep).toHaveBeenCalledTimes(2);
    expect(drop).toHaveBeenCalledTimes(1);
  });

  it("delivers nothing after every listener has unsubscribed", () => {
    const only = vi.fn<Listener>();
    track(only)();
    emitGameNotification({ description: "nobody home" });

    expect(only).not.toHaveBeenCalled();
  });
});

describe("useGameNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps success/info/warning/error to the matching toast variant", () => {
    const { success, info, warning, error } = useGameNotifications();

    success("saved");
    info("heads up");
    warning("careful");
    error("nope");

    expect(mocks.toast).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ description: "saved", variant: "success" }),
    );
    expect(mocks.toast).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ description: "heads up", variant: "info" }),
    );
    expect(mocks.toast).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ description: "careful", variant: "warning" }),
    );
    expect(mocks.toast).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ description: "nope", variant: "destructive" }),
    );
  });

  it("defaults dismissible to true and lets overrides win", () => {
    const { success } = useGameNotifications();

    success("done", { title: "Nice", dismissible: false });

    expect(mocks.toast).toHaveBeenCalledWith({
      title: "Nice",
      description: "done",
      dismissible: false,
      variant: "success",
    });
  });
});
