import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import {
  chmodSync,
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  realpathSync,
} from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { z } from "zod";
import type { ConditionalStore } from "./repository";

// A deliberately small, typed boundary for Node 24's built-in SQLite API.
// Loaded only for the self-hosted driver; Netlify never opens a local database.
interface Statement {
  get(...values: string[]): unknown;
  all(...values: string[]): unknown[];
  run(...values: string[]): { changes: number | bigint };
}
interface Database {
  exec(sql: string): void;
  prepare(sql: string): Statement;
  close(): void;
}
type DatabaseConstructor = new (
  path: string,
  options: { timeout: number },
) => Database;
const rowSchema = z.object({
  key: z.string(),
  value: z.string(),
  etag: z.string(),
});
export const namespaceSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);

export function assertPrivatePath(path: string): void {
  if (!isAbsolute(path))
    throw new Error("Use an absolute private storage path");
  const inside = relative(realpathSync(process.cwd()), resolve(path));
  if (
    !inside ||
    (!inside.startsWith(`..${sep}`) && inside !== ".." && !isAbsolute(inside))
  )
    throw new Error(
      "Storage and exports must be outside the application checkout",
    );
  if (existsSync(path) && lstatSync(path).isSymbolicLink())
    throw new Error("Private storage cannot be a symlink");
  if (existsSync(path) && lstatSync(path).nlink > 1)
    throw new Error("Private storage cannot be a hard link");
  if (existsSync(dirname(path))) {
    const actual = resolve(realpathSync(dirname(path)), basename(path));
    const physical = relative(realpathSync(process.cwd()), actual);
    if (
      !physical ||
      (!physical.startsWith(`..${sep}`) &&
        physical !== ".." &&
        !isAbsolute(physical))
    )
      throw new Error(
        "Private storage resolves inside the application checkout",
      );
  }
}

export class SqliteConditionalStore implements ConditionalStore {
  private readonly database: Database;
  readonly namespace: string;

  constructor(path: string, namespace: string) {
    this.namespace = namespaceSchema.parse(namespace);
    assertPrivatePath(path);
    if (Number(process.versions.node.split(".")[0]) < 24)
      throw new Error("Self-hosted storage requires Node.js 24 or newer");
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    assertPrivatePath(path);
    if (!existsSync(path)) closeSync(openSync(path, "wx", 0o600));
    if (!lstatSync(path).isFile())
      throw new Error("Storage path must be a regular file");
    if (process.platform !== "win32") chmodSync(path, 0o600);
    const requireNode = createRequire(resolve(process.cwd(), "package.json"));
    const sqlite = requireNode("node:sqlite") as {
      DatabaseSync: DatabaseConstructor;
    };
    this.database = new sqlite.DatabaseSync(path, { timeout: 5000 });
    try {
      const version = z
        .object({ user_version: z.number() })
        .parse(this.database.prepare("PRAGMA user_version").get()).user_version;
      const tables = this.database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
        )
        .all();
      if (version !== 0 && version !== 1)
        throw new Error("Unsupported local database version");
      if (version === 0 && tables.length)
        throw new Error("Refusing an unrelated database");
      if (
        version === 1 &&
        (tables.length !== 1 ||
          z.object({ name: z.string() }).parse(tables[0]).name !==
            "toolor_entries")
      )
        throw new Error("Refusing an unrelated database");
      this.database.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = FULL;
        CREATE TABLE IF NOT EXISTS toolor_entries (
          namespace TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
          etag TEXT NOT NULL, PRIMARY KEY (namespace, key)
        ) STRICT;
        PRAGMA user_version = 1;
      `);
    } catch (error) {
      this.database.close();
      throw error;
    }
  }

  async get(key: string) {
    const raw = this.database
      .prepare(
        "SELECT key, value, etag FROM toolor_entries WHERE namespace = ? AND key = ?",
      )
      .get(this.namespace, key);
    if (!raw) return null;
    const row = rowSchema.parse(raw);
    return { value: JSON.parse(row.value) as unknown, etag: row.etag };
  }

  async set(
    key: string,
    value: unknown,
    condition: { onlyIfNew: true } | { onlyIfMatch: string },
  ) {
    const json = JSON.stringify(value);
    if (json === undefined) throw new Error("Storage requires a JSON value");
    const etag = randomUUID();
    const result =
      "onlyIfNew" in condition
        ? this.database
            .prepare(
              "INSERT INTO toolor_entries (namespace, key, value, etag) VALUES (?, ?, ?, ?) ON CONFLICT (namespace, key) DO NOTHING",
            )
            .run(this.namespace, key, json, etag)
        : this.database
            .prepare(
              "UPDATE toolor_entries SET value = ?, etag = ? WHERE namespace = ? AND key = ? AND etag = ?",
            )
            .run(json, etag, this.namespace, key, condition.onlyIfMatch);
    return Number(result.changes) === 1;
  }

  async keys(prefix: string) {
    return this.database
      .prepare(
        "SELECT key FROM toolor_entries WHERE namespace = ? AND substr(key, 1, length(?)) = ? ORDER BY key",
      )
      .all(this.namespace, prefix, prefix)
      .map((row) => z.object({ key: z.string() }).parse(row).key);
  }

  /** One SELECT is a consistent SQLite snapshot, including both record prefixes. */
  snapshot() {
    return this.database
      .prepare(
        "SELECT key, value, etag FROM toolor_entries WHERE namespace = ? ORDER BY key",
      )
      .all(this.namespace)
      .map((raw) => {
        const row = rowSchema.parse(raw);
        return { key: row.key, value: JSON.parse(row.value) as unknown };
      });
  }

  /** Offline-only migration into an empty namespace: all records or none. */
  importIntoEmpty(entries: { key: string; value: unknown }[]) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const row = z
        .object({ count: z.number() })
        .parse(
          this.database
            .prepare(
              "SELECT count(*) AS count FROM toolor_entries WHERE namespace = ?",
            )
            .get(this.namespace),
        );
      if (row.count)
        throw new Error("Refusing to overwrite an existing order namespace");
      const insert = this.database.prepare(
        "INSERT INTO toolor_entries (namespace, key, value, etag) VALUES (?, ?, ?, ?)",
      );
      for (const entry of entries) {
        const json = JSON.stringify(entry.value);
        if (json === undefined)
          throw new Error("Storage requires a JSON value");
        insert.run(this.namespace, entry.key, json, randomUUID());
      }
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  close() {
    this.database.close();
  }
}

let cached:
  | { path: string; namespace: string; store: SqliteConditionalStore }
  | undefined;
export function configuredSqliteStore(): SqliteConditionalStore {
  const path = process.env.ORDER_SQLITE_PATH?.trim();
  const namespace = process.env.ORDER_STORAGE_NAMESPACE?.trim();
  if (!path || !namespace)
    throw new Error("Configure private SQLite path and namespace");
  if (cached?.path === path && cached.namespace === namespace)
    return cached.store;
  if (cached)
    throw new Error("Restart the server after changing storage configuration");
  const store = new SqliteConditionalStore(path, namespace);
  cached = { path, namespace, store };
  return store;
}
