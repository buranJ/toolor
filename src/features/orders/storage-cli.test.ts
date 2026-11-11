// @vitest-environment node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  copyFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";
import { validateArchive } from "./archive";
import { SqliteConditionalStore } from "./sqlite-store";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "toolor-cli-test-"));
  directories.push(directory);
  const archive = join(directory, "synthetic.orders-backup.json");
  const bytes = JSON.stringify({
    format: "toolor-orders",
    version: 1,
    namespace: "synthetic",
    createdAt: new Date().toISOString(),
    entries: [],
  });
  writeFileSync(archive, bytes, { mode: 0o600 });
  return {
    directory,
    archive,
    hash: createHash("sha256").update(bytes).digest("hex"),
    database: join(directory, "orders.sqlite"),
  };
}
function run(args: string[], database: string, namespace = "synthetic") {
  return spawnSync(
    process.execPath,
    ["--import", "tsx", resolve("scripts/order-storage.ts"), ...args],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 15_000,
      env: {
        NODE_ENV: "test",
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        ORDER_STORAGE_NAMESPACE: namespace,
        ORDER_SQLITE_PATH: database,
      },
    },
  );
}
it("preflights private imported SQLite without a server, network or checkout dotenv files", () => {
  const f = fixture();
  const app = join(f.directory, "app");
  mkdirSync(join(app, "scripts"), { recursive: true });
  mkdirSync(join(app, ".next"));
  const entry = join(app, "scripts", "start-self-hosted.mjs");
  copyFileSync(resolve("scripts/start-self-hosted.mjs"), entry);
  writeFileSync(join(app, ".next", "BUILD_ID"), "synthetic-build");
  const db = new SqliteConditionalStore(f.database, "synthetic");
  db.close();
  const privateEnv = join(f.directory, "production.env");
  writeFileSync(
    privateEnv,
    [
      "ORDER_STORAGE_DRIVER=sqlite",
      "ORDER_STORAGE_NAMESPACE=synthetic",
      `ORDER_SQLITE_PATH=${f.database}`,
      "ORDER_MAINTENANCE=1",
      "TELEGRAM_BOT_TOKEN=123456:synthetic_test_only",
      "TELEGRAM_CHAT_ID=123",
      "TELEGRAM_OPERATOR_ID=123",
      `TELEGRAM_WEBHOOK_SECRET=${"synthetic".repeat(8)}`,
    ].join("\n"),
    { mode: 0o600 },
  );
  const preflight = () =>
    spawnSync(process.execPath, [entry, "--check"], {
      encoding: "utf8",
      timeout: 15_000,
      env: {
        NODE_ENV: "test",
        TOOLOR_ENV_FILE: privateEnv,
        SystemRoot: process.env.SystemRoot,
      },
    });
  const result = preflight();
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("No server started");
  writeFileSync(join(app, ".env.local"), "synthetic-only=1");
  const rejected = preflight();
  expect(rejected.status).toBe(1);
  expect(rejected.stderr).not.toContain(f.database);
  expect(rejected.stderr).not.toContain("synthetic_test_only");
});
it("checksums offline imports before opening a database; backups are verifiable and exclusive", () => {
  const f = fixture();
  const damaged = run(
    [
      "import-sqlite",
      "--offline",
      "--file",
      f.archive,
      "--sha256",
      "0".repeat(64),
    ],
    f.database,
  );
  expect(damaged.status).toBe(1);
  expect(existsSync(f.database)).toBe(false);
  expect(damaged.stderr).not.toContain(f.database);
  expect(
    run(["import-sqlite", "--file", f.archive, "--sha256", f.hash], f.database)
      .status,
  ).toBe(1);
  expect(
    run(
      ["import-sqlite", "--offline", "--file", f.archive, "--sha256", f.hash],
      f.database,
      "wrong",
    ).status,
  ).toBe(1);
  expect(existsSync(f.database)).toBe(false);
  const imported = run(
    ["import-sqlite", "--offline", "--file", f.archive, "--sha256", f.hash],
    f.database,
  );
  expect(imported.status, imported.stderr).toBe(0);
  expect(JSON.parse(imported.stdout)).toMatchObject({
    imported: true,
    orders: 0,
    sha256: f.hash,
  });
  const backup = join(f.directory, "new.orders-backup.json");
  const exported = run(["backup-sqlite", "--file", backup], f.database);
  expect(exported.status, exported.stderr).toBe(0);
  expect(
    validateArchive(JSON.parse(readFileSync(backup, "utf8"))).entries,
  ).toEqual([]);
  const backupHash = (JSON.parse(exported.stdout) as { sha256: string }).sha256;
  expect(
    run(["verify", "--file", backup, "--sha256", backupHash], f.database)
      .status,
  ).toBe(0);
  const before = readFileSync(backup);
  expect(run(["backup-sqlite", "--file", backup], f.database).status).toBe(1);
  expect(readFileSync(backup)).toEqual(before);
  // Several fresh Node/tsx processes can exceed Vitest's default on a busy host.
}, 30_000);
