/** Offline operator CLI. Never sends Telegram messages or changes webhooks. */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import {
  archiveSummary,
  exportArchive,
  validateArchive,
} from "../src/features/orders/archive";
import { netlifyConditionalStore } from "../src/features/orders/netlify-store";
import {
  assertPrivatePath,
  namespaceSchema,
  SqliteConditionalStore,
} from "../src/features/orders/sqlite-store";

const maxBytes = 100 * 1024 * 1024;
function readArchive(path: string, expectedHash?: string) {
  assertPrivatePath(path);
  if (statSync(path).size > maxBytes) throw new Error("Archive too large");
  const bytes = readFileSync(path);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (expectedHash && expectedHash.toLowerCase() !== sha256)
    throw new Error("Archive checksum mismatch");
  return {
    archive: validateArchive(JSON.parse(bytes.toString("utf8")) as unknown),
    sha256,
  };
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      file: { type: "string" },
      sha256: { type: "string" },
      offline: { type: "boolean" },
      quiesced: { type: "boolean" },
      "env-file": { type: "string" },
    },
  });
  // Explicit, private operator environment; never load development secrets.
  if (values["env-file"]) {
    assertPrivatePath(values["env-file"]);
    process.loadEnvFile(values["env-file"]);
  }
  const command = positionals[0];
  if (positionals.length !== 1 || !values.file)
    throw new Error(
      "Use export-netlify, backup-sqlite, verify or import-sqlite with --file <absolute-private-path>",
    );
  const path = values.file;
  assertPrivatePath(path);
  if (command === "verify") {
    const { archive, sha256 } = readArchive(path, values.sha256);
    console.log(JSON.stringify({ ...archiveSummary(archive), sha256 }));
    return;
  }
  const namespace = namespaceSchema.parse(process.env.ORDER_STORAGE_NAMESPACE);
  if (command === "import-sqlite") {
    if (
      !values.offline ||
      !values.sha256 ||
      !/^[a-f0-9]{64}$/i.test(values.sha256)
    )
      throw new Error(
        "Import requires --offline and --sha256 from the source export",
      );
    const { archive, sha256 } = readArchive(path, values.sha256);
    if (archive.namespace !== namespace)
      throw new Error("Order namespace mismatch");
    const databasePath = process.env.ORDER_SQLITE_PATH?.trim();
    if (!databasePath) throw new Error("Configure ORDER_SQLITE_PATH privately");
    const store = new SqliteConditionalStore(databasePath, namespace);
    try {
      store.importIntoEmpty(archive.entries);
      const restored = validateArchive({
        ...archive,
        entries: store.snapshot(),
      });
      console.log(
        JSON.stringify({ imported: true, ...archiveSummary(restored), sha256 }),
      );
    } finally {
      store.close();
    }
    return;
  }
  let archive;
  if (command === "export-netlify") {
    if (!values.quiesced)
      throw new Error(
        "Final Netlify export requires --quiesced after both order routes are paused",
      );
    const siteID = process.env.NETLIFY_SITE_ID?.trim();
    const token = process.env.NETLIFY_AUTH_TOKEN?.trim();
    if (!siteID || !token)
      throw new Error(
        "Configure Netlify credentials in a private operator environment",
      );
    archive = await exportArchive(
      netlifyConditionalStore(namespace, { siteID, token }),
      namespace,
    );
  } else if (command === "backup-sqlite") {
    const databasePath = process.env.ORDER_SQLITE_PATH?.trim();
    if (!databasePath || !existsSync(databasePath))
      throw new Error("Existing local database required");
    if (resolve(databasePath) === resolve(path))
      throw new Error("Backup must not replace its database");
    const store = new SqliteConditionalStore(databasePath, namespace);
    try {
      archive = validateArchive({
        format: "toolor-orders",
        version: 1,
        namespace,
        createdAt: new Date().toISOString(),
        entries: store.snapshot(),
      });
    } finally {
      store.close();
    }
  } else throw new Error("Unknown storage command");
  const bytes = Buffer.from(JSON.stringify(archive, null, 2) + "\n");
  if (bytes.length > maxBytes) throw new Error("Archive too large");
  // Exclusive creation: a typo cannot overwrite an existing backup/database.
  writeFileSync(path, bytes, { flag: "wx", mode: 0o600 });
  console.log(
    JSON.stringify({
      ...archiveSummary(archive),
      sha256: createHash("sha256").update(bytes).digest("hex"),
    }),
  );
}

main().catch(() => {
  // SDK/SQL/Zod errors can include credentials, file paths or buyer values.
  console.error(
    "Storage operation failed. Check command, private paths, checksum, namespace, credentials and maintenance state. Sensitive details hidden; no automatic retry.",
  );
  process.exitCode = 1;
});
