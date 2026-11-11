// @vitest-environment node
import { mkdtempSync, rmSync, statSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SqliteConditionalStore, assertPrivatePath } from "./sqlite-store";
import { OrderRepository, type ConditionalStore } from "./repository";
import { archiveSummary, exportArchive, validateArchive } from "./archive";
import type { OrderRequest } from "@/features/checkout/order-request";

const directories: string[] = [];
const stores: SqliteConditionalStore[] = [];
function fixture(namespace = "synthetic-orders", path?: string) {
  if (!path) {
    const directory = mkdtempSync(join(tmpdir(), "toolor-sqlite-test-"));
    directories.push(directory);
    path = join(directory, "orders.sqlite");
  }
  const store = new SqliteConditionalStore(path, namespace);
  stores.push(store);
  return { store, path, repository: new OrderRepository(store) };
}
function order(): OrderRequest {
  return {
    requestId: randomUUID(),
    number: "SYNTHETIC-DO-NOT-FULFIL",
    createdAt: new Date().toISOString(),
    locale: "ru",
    consent: true,
    delivery: "regions",
    customer: {
      name: "Синтетический тест",
      phone: "+00000000000",
      email: "test@example.com",
      city: "Тест",
      address: "Вымышленный адрес",
      comment: "Не покупка",
    },
    subtotal: 100,
    items: [
      {
        productId: "synthetic",
        slug: "synthetic",
        variantId: "synthetic-variant",
        name: "Тестовый товар",
        variant: "Тест",
        sku: "TEST",
        options: {},
        quantity: 1,
        unitAmount: 100,
      },
    ],
  };
}
afterEach(() => {
  for (const store of stores.splice(0)) store.close();
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("self-hosted durable storage", () => {
  it("persists workflows and immutable claims across connection recreation", async () => {
    const first = fixture();
    const created = await first.repository.create(
      order(),
      "synthetic-fingerprint",
    );
    await first.repository.transition(
      created.record.order.requestId,
      1,
      "working",
      "123",
      "take",
    );
    first.store.close();
    stores.splice(stores.indexOf(first.store), 1);
    const reopened = fixture("synthetic-orders", first.path);
    expect(
      (await reopened.repository.get(created.record.order.requestId))?.record
        .status,
    ).toBe("working");
    expect((await reopened.repository.list("working")).items).toHaveLength(1);
    expect(await reopened.store.keys("references/")).toHaveLength(1);
  });
  it("permits only one winner for concurrent UUID claims and stale CAS writes", async () => {
    const first = fixture();
    const second = fixture("synthetic-orders", first.path);
    const input = order();
    const entries = await Promise.all([
      first.repository.create(input, "original"),
      second.repository.create(
        { ...input, customer: { ...input.customer, name: "Different test" } },
        "different",
      ),
    ]);
    expect(entries[0].record.order).toEqual(entries[1].record.order);
    expect(entries[0].record.fingerprint).toBe("original");
    const changed = await first.repository.transition(
      input.requestId,
      1,
      "working",
      "123",
      "one",
    );
    expect(changed.kind).toBe("changed");
    expect(
      await second.repository.replace(entries[1], {
        ...entries[1].record,
        revision: 2,
        status: "cancelled",
      }),
    ).toBe(false);
  });
  it("allows one CAS winner across four independent Node processes", async () => {
    const target = fixture();
    await target.store.set(
      "synthetic-cas",
      { winner: "initial" },
      { onlyIfNew: true },
    );
    const initial = await target.store.get("synthetic-cas");
    const modulePath = resolve("src/features/orders/sqlite-store.ts");
    const outcomes = await Promise.all(
      Array.from(
        { length: 4 },
        (_, index) =>
          new Promise<string>((accept, reject) => {
            const source = `import { SqliteConditionalStore } from ${JSON.stringify(modulePath)};
        const store = new SqliteConditionalStore(${JSON.stringify(target.path)}, 'synthetic-orders');
        const changed = await store.set('synthetic-cas', { winner: ${index} }, { onlyIfMatch: ${JSON.stringify(initial!.etag)} });
        store.close(); process.stdout.write(String(changed));`;
            const child = spawn(
              process.execPath,
              ["--import", "tsx", "--input-type=module", "--eval", source],
              {
                cwd: process.cwd(),
                env: {
                  NODE_ENV: "test",
                  PATH: process.env.PATH,
                  SystemRoot: process.env.SystemRoot,
                },
                stdio: ["ignore", "pipe", "pipe"],
              },
            );
            let output = "";
            child.stdout.on("data", (chunk: Buffer) => {
              output += chunk.toString();
            });
            child.once("error", reject);
            child.once("exit", (code) => {
              if (code === 0) accept(output);
              else reject(new Error("Synthetic worker failed"));
            });
          }),
      ),
    );
    expect(outcomes.filter((outcome) => outcome === "true")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome === "false")).toHaveLength(3);
  });
  it("isolates namespaces and treats prefix wildcard characters literally", async () => {
    const first = fixture();
    const second = fixture("preview", first.path);
    await first.store.set("a_%/one", { test: 1 }, { onlyIfNew: true });
    await first.store.set("abc/two", { test: 2 }, { onlyIfNew: true });
    expect(await first.store.keys("a_%/")).toEqual(["a_%/one"]);
    expect(await second.store.keys("")).toEqual([]);
    expect(await second.store.get("a_%/one")).toBeNull();
  });
  it("refuses public/relative paths and symlinks, and protects Unix file permissions", () => {
    expect(() => assertPrivatePath("./orders.sqlite")).toThrow("absolute");
    expect(() => fixture("bad", resolve("public/orders.sqlite"))).toThrow(
      "outside",
    );
    expect(() => fixture("../invalid")).toThrow();
    const { path } = fixture();
    if (process.platform !== "win32") {
      expect(statSync(path).mode & 0o777).toBe(0o600);
      const link = join(directories.at(-1)!, "link.sqlite");
      symlinkSync(path, link);
      expect(() => assertPrivatePath(link)).toThrow("symlink");
    }
  });
  it("restores both prefixes and existing Telegram receipts without resetting status", async () => {
    const source = fixture();
    const created = await source.repository.create(order(), "fingerprint");
    await source.repository.replace(created, {
      ...created.record,
      revision: 2,
      delivery: "sent",
      messageId: 123,
    });
    await source.repository.transition(
      created.record.order.requestId,
      1,
      "working",
      "123",
      "take",
    );
    await source.repository.transition(
      created.record.order.requestId,
      2,
      "shipped",
      "123",
      "ship",
    );
    const archive = await exportArchive(source.store, "synthetic-orders");
    expect(archiveSummary(archive)).toEqual({
      references: 1,
      orders: 1,
      recoveryClaims: 0,
    });
    const target = fixture();
    target.store.importIntoEmpty(validateArchive(archive).entries);
    const original = await source.repository.get(
      created.record.order.requestId,
    );
    const restored = await target.repository.get(
      created.record.order.requestId,
    );
    expect(restored?.record).toEqual(original?.record);
    expect(restored?.etag).not.toBe(original?.etag);
    expect(() => target.store.importIntoEmpty(archive.entries)).toThrow(
      "overwrite",
    );
  });
  it("rolls back the entire import on a duplicate or serialization error", async () => {
    const target = fixture();
    expect(() =>
      target.store.importIntoEmpty([
        { key: "a", value: {} },
        { key: "a", value: {} },
      ]),
    ).toThrow();
    expect(await target.store.keys("")).toEqual([]);
    expect(() =>
      target.store.importIntoEmpty([
        { key: "a", value: {} },
        { key: "b", value: BigInt(1) },
      ]),
    ).toThrow();
    expect(await target.store.keys("")).toEqual([]);
  });
  it("rejects missing/forged references, modified snapshots and duplicate archive keys", async () => {
    const source = fixture();
    await source.repository.create(order(), "fingerprint");
    const archive = await exportArchive(source.store, "synthetic-orders");
    expect(() =>
      validateArchive({
        ...archive,
        entries: archive.entries.filter((entry) =>
          entry.key.startsWith("orders/"),
        ),
      }),
    ).toThrow();
    expect(() =>
      validateArchive({
        ...archive,
        entries: [...archive.entries, archive.entries[0]],
      }),
    ).toThrow("Duplicate");
    const record = archive.entries.find((entry) =>
      entry.key.startsWith("orders/"),
    )!;
    const damaged = {
      ...record,
      value: { ...(record.value as object), fingerprint: "forged" },
    };
    expect(() =>
      validateArchive({
        ...archive,
        entries: archive.entries.map((entry) =>
          entry.key === record.key ? damaged : entry,
        ),
      }),
    ).toThrow("mismatch");
    expect(() => validateArchive({ ...archive, version: 2 })).toThrow();
  });
  it("keeps reference-only crash recovery claims without inventing delivery", async () => {
    const source = fixture();
    await source.repository.create(order(), "fingerprint");
    const archive = await exportArchive(source.store, "synthetic-orders");
    const claims = validateArchive({
      ...archive,
      entries: archive.entries.filter((entry) =>
        entry.key.startsWith("references/"),
      ),
    });
    expect(archiveSummary(claims).recoveryClaims).toBe(1);
    const target = fixture();
    target.store.importIntoEmpty(claims.entries);
    expect(await target.store.keys("orders/")).toEqual([]);
  });
  it("rejects exports when source versions change mid-read", async () => {
    const source = fixture();
    await source.repository.create(order(), "fingerprint");
    const unstable: ConditionalStore = {
      keys: (prefix) => source.store.keys(prefix),
      set: (...args) => source.store.set(...args),
      get: vi.fn(async (key: string) => {
        const entry = await source.store.get(key);
        if (entry)
          await source.store.set(key, entry.value, { onlyIfMatch: entry.etag });
        return entry;
      }),
    };
    await expect(exportArchive(unstable, "synthetic-orders")).rejects.toThrow(
      "changed",
    );
  });
});
