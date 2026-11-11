/** Windows/Linux production entry point. No tunnel setup, DNS changes or messages. */
import { spawn } from "node:child_process";
import { existsSync, lstatSync, realpathSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function privateFile(path) {
  if (
    !path ||
    !isAbsolute(path) ||
    !existsSync(path) ||
    lstatSync(path).isSymbolicLink() ||
    !lstatSync(path).isFile()
  )
    throw new Error("An existing private regular file is required");
  const rel = relative(realpathSync(app), realpathSync(path));
  if (!rel || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel)))
    throw new Error("Secrets and database must be outside the application");
  if (process.platform !== "win32" && lstatSync(path).mode & 0o077)
    throw new Error("Private files must not be accessible to other Unix users");
}

try {
  if (Number(process.versions.node.split(".")[0]) !== 24)
    throw new Error("Use the verified Node.js 24 runtime");
  process.chdir(app);
  // Next also loads dotenv files: forbid accidental development/Netlify secrets.
  for (const name of [
    ".env",
    ".env.local",
    ".env.production",
    ".env.production.local",
  ])
    if (existsSync(resolve(app, name)))
      throw new Error("Remove checkout dotenv files before production start");
  const envFile = process.env.TOOLOR_ENV_FILE;
  privateFile(envFile);
  process.loadEnvFile(envFile);
  if (
    process.env.ORDER_STORAGE_DRIVER !== "sqlite" ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(process.env.ORDER_STORAGE_NAMESPACE ?? "")
  )
    throw new Error("Configure durable SQLite storage");
  if (!/^[01]$/.test(process.env.ORDER_MAINTENANCE ?? ""))
    throw new Error("Set maintenance explicitly");
  if (
    !/^\d+:[a-zA-Z0-9_-]+$/.test(process.env.TELEGRAM_BOT_TOKEN ?? "") ||
    !/^\d+$/.test(process.env.TELEGRAM_CHAT_ID ?? "") ||
    process.env.TELEGRAM_OPERATOR_ID !== process.env.TELEGRAM_CHAT_ID ||
    !/^[a-zA-Z0-9_-]{32,256}$/.test(
      process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
    ) ||
    process.env.TELEGRAM_MESSAGE_THREAD_ID
  )
    throw new Error("Configure the primary private Telegram operator");
  if (process.env.TELEGRAM_OPERATOR_IDS?.trim()) {
    const ids = process.env.TELEGRAM_OPERATOR_IDS.split(",").map((id) =>
      id.trim(),
    );
    if (
      ids.length > 20 ||
      new Set(ids).size !== ids.length ||
      !ids.includes(process.env.TELEGRAM_OPERATOR_ID) ||
      ids.some(
        (id) => !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)),
      )
    )
      throw new Error("Configure an explicit private staff allowlist");
  }
  if (process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_SITE_ID)
    throw new Error(
      "Do not give the application Netlify migration credentials",
    );
  const databasePath = process.env.ORDER_SQLITE_PATH;
  privateFile(databasePath);
  // Read-only preflight: no empty database creation, no messages, no mutations.
  const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite");
  const database = new DatabaseSync(databasePath, {
    readOnly: true,
    timeout: 5000,
  });
  try {
    if (
      database.prepare("PRAGMA user_version").get().user_version !== 1 ||
      database.prepare("PRAGMA quick_check").get().quick_check !== "ok"
    )
      throw new Error("Local database verification failed");
    database
      .prepare(
        "SELECT key, value, etag FROM toolor_entries WHERE namespace = ? LIMIT 1",
      )
      .get(process.env.ORDER_STORAGE_NAMESPACE);
  } finally {
    database.close();
  }
  if (!readFileSync(resolve(app, ".next/BUILD_ID"), "utf8").trim())
    throw new Error("Build required");
  const port = process.env.TOOLOR_PORT ?? "3100";
  if (!/^\d{4,5}$/.test(port) || Number(port) < 1024 || Number(port) > 65535)
    throw new Error("Invalid local port");
  if (
    process.argv.slice(2).length &&
    !(process.argv.length === 3 && process.argv[2] === "--check")
  )
    throw new Error("Unknown launch option");
  if (process.argv[2] === "--check") {
    console.log(
      "TOOLOR preflight passed. No server started, no external requests made.",
    );
  } else {
    const child = spawn(
      process.execPath,
      [
        resolve(app, "node_modules/next/dist/bin/next"),
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        port,
      ],
      {
        cwd: app,
        env: { ...process.env, NODE_ENV: "production" },
        stdio: "inherit",
        shell: false,
      },
    );
    let stopping = false;
    for (const signal of ["SIGINT", "SIGTERM"])
      process.once(signal, () => {
        stopping = true;
        child.kill(signal);
      });
    child.once("error", () => {
      console.error(
        "TOOLOR process could not start. Sensitive details hidden.",
      );
      process.exitCode = 1;
    });
    child.once("exit", (code) => {
      process.exitCode = stopping ? 0 : code && code > 0 ? code : 1;
    });
  }
} catch {
  console.error(
    "TOOLOR preflight failed. Check Node 24, production build, private paths/permissions, SQLite import and server environment. Sensitive details hidden.",
  );
  process.exitCode = 1;
}
