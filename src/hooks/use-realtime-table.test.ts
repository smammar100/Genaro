/** useRealtimeTable: live changes call onChange, and a reconnect catches up on what it missed. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

type Status = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";
interface Entry {
  name: string;
  filter: string;
  removed: boolean;
  onEvent: () => void;
  setStatus: (s: Status) => void;
}
// Behaves like supabase-js: a channel stays listed until it has closed, so asking
// for the same name again hands it back; removing one reports CLOSED to it.
const rt = vi.hoisted(() => ({ channels: [] as Entry[], byObject: new Map<object, Entry>() }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: (name: string) => {
      const listed = rt.channels.find((e) => e.name === name && !e.removed);
      if (listed) return [...rt.byObject].find(([, e]) => e === listed)![0];
      const entry: Entry = { name, filter: "", removed: false, onEvent: () => undefined, setStatus: () => undefined };
      const channel = {
        on: (_type: string, opts: { filter: string }, cb: () => void) => {
          entry.filter = opts.filter;
          entry.onEvent = cb;
          return channel;
        },
        subscribe: (cb: (s: Status) => void) => {
          entry.setStatus = cb;
          return channel;
        },
      };
      rt.channels.push(entry);
      rt.byObject.set(channel, entry);
      return channel;
    },
    removeChannel: async (channel: object) => {
      const entry = rt.byObject.get(channel)!;
      entry.removed = true;
      entry.setStatus("CLOSED");
    },
  }),
}));
vi.mock("@/lib/cache", () => ({ invalidate: vi.fn() }));

import { useRealtimeTable } from "./use-realtime-table";

const live = () => rt.channels.filter((e) => !e.removed);
const latest = () => rt.channels[rt.channels.length - 1];
const status = (s: Status) => act(() => latest().setStatus(s));
const wait = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

beforeEach(() => {
  vi.useFakeTimers();
  rt.channels = [];
  rt.byObject.clear();
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

  it("refetches once after the channel drops and comes back", async () => {
    const onChange = vi.fn();
    renderHook(() => useRealtimeTable({ table: "messages", companyId: "co-1", onChange }));
    status("SUBSCRIBED");
    status("CHANNEL_ERROR");
    await wait(2000);
    expect(rt.channels).toHaveLength(2);
    status("SUBSCRIBED");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("catches up when the tab comes back into focus", async () => {
    const onChange = vi.fn();
    renderHook(() => useRealtimeTable({ table: "notifications", companyId: "u-1", filterColumn: "user_id", onChange }));
    status("SUBSCRIBED");
    act(() => void window.dispatchEvent(new Event("focus")));
    await wait(500);
    expect(latest().filter).toBe("user_id=eq.u-1");
    status("SUBSCRIBED");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("settles after a reconnect: removing the old channel doesn't start a loop", async () => {
    const onChange = vi.fn();
    renderHook(() => useRealtimeTable({ table: "messages", companyId: "co-1", onChange }));
    status("SUBSCRIBED");
    act(() => void window.dispatchEvent(new Event("focus")));
    await wait(500);
    status("SUBSCRIBED");
    await wait(30_000);
    expect(rt.channels).toHaveLength(2);
    expect(live()).toHaveLength(1);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("closes its channel when the page goes, without reconnecting", async () => {
    const { unmount } = renderHook(() => useRealtimeTable({ table: "messages", companyId: "co-1" }));
    status("SUBSCRIBED");
    unmount();
    await wait(30_000);
    expect(rt.channels).toHaveLength(1);
    expect(live()).toHaveLength(0);
  });

  it("does nothing without a company", () => {
    renderHook(() => useRealtimeTable({ table: "messages", companyId: null }));
    expect(rt.channels).toHaveLength(0);
  });
});
