/** useRealtimeTable: live changes call onChange, and a reconnect catches up on what it missed. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

type Status = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";
const rt = vi.hoisted(() => ({
  channels: [] as { name: string; filter: string; onEvent: () => void; setStatus: (s: string) => void }[],
  removed: 0,
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: (name: string) => {
      const entry: (typeof rt.channels)[number] = { name, filter: "", onEvent: () => undefined, setStatus: () => undefined };
      const channel = {
        on: (_type: string, opts: { filter: string }, cb: () => void) => {
          entry.filter = opts.filter;
          entry.onEvent = cb;
          return channel;
        },
        subscribe: (cb: (s: string) => void) => {
          entry.setStatus = cb;
          rt.channels.push(entry);
          return channel;
        },
      };
      return channel;
    },
    removeChannel: async () => {
      rt.removed += 1;
    },
  }),
}));
vi.mock("@/lib/cache", () => ({ invalidate: vi.fn() }));

import { useRealtimeTable } from "./use-realtime-table";

const latest = () => rt.channels[rt.channels.length - 1];
const status = (s: Status) => act(() => latest().setStatus(s));

beforeEach(() => {
  vi.useFakeTimers();
  rt.channels = [];
  rt.removed = 0;
});
afterEach(() => vi.useRealTimers());

describe("useRealtimeTable", () => {
  it("subscribes to the company's rows and calls onChange for each change", () => {
    const onChange = vi.fn();
    renderHook(() => useRealtimeTable({ table: "messages", companyId: "co-1", onChange }));
    expect(latest().filter).toBe("company_id=eq.co-1");
    status("SUBSCRIBED");
    expect(onChange).not.toHaveBeenCalled();
    act(() => latest().onEvent());
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("refetches once after the channel drops and comes back", () => {
    const onChange = vi.fn();
    renderHook(() => useRealtimeTable({ table: "messages", companyId: "co-1", onChange }));
    status("SUBSCRIBED");
    status("CLOSED");
    act(() => vi.advanceTimersByTime(2000));
    expect(rt.channels).toHaveLength(2);
    status("SUBSCRIBED");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("catches up when the tab comes back into focus", () => {
    const onChange = vi.fn();
    renderHook(() => useRealtimeTable({ table: "notifications", companyId: "u-1", filterColumn: "user_id", onChange }));
    status("SUBSCRIBED");
    act(() => {
      window.dispatchEvent(new Event("focus"));
      vi.advanceTimersByTime(500);
    });
    expect(latest().filter).toBe("user_id=eq.u-1");
    status("SUBSCRIBED");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does nothing without a company", () => {
    renderHook(() => useRealtimeTable({ table: "messages", companyId: null }));
    expect(rt.channels).toHaveLength(0);
  });
});
