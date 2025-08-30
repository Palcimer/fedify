import type {
  KVNamespace,
  Queue,
} from "@cloudflare/workers-types/experimental";
import { delay } from "es-toolkit";
import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { describe, test } from "node:test";
import { WorkersKvStore, WorkersMessageQueue } from "./mod.ts";

describe("WorkersKvStore", {
  skip: !("navigator" in globalThis &&
    navigator.userAgent === "Cloudflare-Workers"),
}, () => {
  test("set() & get()", async (t) => {
    const { env } = t as unknown as {
      env: Record<string, KVNamespace<string>>;
    };
    const store = new WorkersKvStore(env.KV1);

    await store.set(["foo", "bar"], { foo: 1, bar: 2 });
    deepStrictEqual(await store.get(["foo", "bar"]), { foo: 1, bar: 2 });
    strictEqual(await store.get(["foo"]), undefined);

    await store.set(["foo", "baz"], "baz", {
      ttl: Temporal.Duration.from({ seconds: 0 }),
    });
    strictEqual(await store.get(["foo", "baz"]), undefined);
  });

  test("delete()", async (t) => {
    const { env } = t as unknown as {
      env: Record<string, KVNamespace<string>>;
    };
    const store = new WorkersKvStore(env.KV1);

    await store.delete(["foo", "bar"]);
    strictEqual(await store.get(["foo", "bar"]), undefined);
  });
});

describe("WorkersMessageQueue", {
  skip: !("navigator" in globalThis &&
    navigator.userAgent === "Cloudflare-Workers"),
}, () => {
  test("message queue operations", async (t) => {
    const { env, messageBatches } = t as unknown as {
      env: Record<string, Queue>;
      messageBatches: MessageBatch[];
    };
    const queue = new WorkersMessageQueue(env.Q1);
    await queue.enqueue({ foo: 1, bar: 2 });
    await waitFor(() => messageBatches.length > 0, 5000);
    strictEqual(messageBatches.length, 1);
    strictEqual(messageBatches[0].queue, "Q1");
    strictEqual(messageBatches[0].messages.length, 1);
    deepStrictEqual(messageBatches[0].messages[0].body, { foo: 1, bar: 2 });

    await queue.enqueue(
      { baz: 3, qux: 4 },
      { delay: Temporal.Duration.from({ seconds: 3 }) },
    );
    await delay(2000);
    strictEqual(messageBatches.length, 1);
    await waitFor(() => messageBatches.length > 1, 6000);
    strictEqual(messageBatches[1].queue, "Q1");
    strictEqual(messageBatches[1].messages.length, 1);
    deepStrictEqual(messageBatches[1].messages[0].body, { baz: 3, qux: 4 });
  });
});

async function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
): Promise<void> {
  let delayed = 0;
  while (!predicate()) {
    await delay(500);
    delayed += 500;
    if (delayed > timeoutMs) {
      throw new Error("Timeout");
    }
  }
}
