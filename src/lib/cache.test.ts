import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

import { invalidate, invalidateAll, withCache } from "./cache";

/** A read the test resolves by hand, to hold it in flight across a write. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe("withCache", () => {
  beforeEach(() => invalidateAll());

  it("joins a read already out and caches its answer", async () => {
    const fetcher = vi.fn().mockResolvedValue(["deal"]);
    const [a, b] = await Promise.all([
      withCache("sales:all", fetcher),
      withCache("sales:all", fetcher),
    ]);
    expect(a).toEqual(["deal"]);
    expect(b).toEqual(["deal"]);
    await withCache("sales:all", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not hand a read sent before a write to a caller after it", async () => {
    const before = deferred<string>();
    const first = withCache("sales:all", () => before.promise);
    invalidate("sales:");
    const second = withCache("sales:all", async () => "after the write");
    before.resolve("before the write");
    expect(await first).toBe("before the write");
    expect(await second).toBe("after the write");
  });

  it("does not cache a read that an invalidate overtook", async () => {
    const before = deferred<string>();
    const first = withCache("sales:all", () => before.promise);
    invalidate("sales:");
    before.resolve("before the write");
    await first;
    const fresh = vi.fn().mockResolvedValue("after the write");
    expect(await withCache("sales:all", fresh)).toBe("after the write");
    expect(fresh).toHaveBeenCalledTimes(1);
  });
});
