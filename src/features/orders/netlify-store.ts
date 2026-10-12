import { getStore } from "@netlify/blobs";
import { OrderRepository, type ConditionalStore } from "./repository";

/** Lazily create the SDK store in request scope, not at build time. Contexts
 * have separate namespaces: previews cannot read production customer data. */
export function orderRepository(): OrderRepository | undefined {
  const driver = process.env.ORDER_STORAGE_DRIVER?.trim();
  if (!driver) return undefined;
  if (driver !== "netlify") throw new Error("Unsupported order storage driver");
  const name = process.env.ORDER_STORAGE_NAMESPACE?.trim();
  if (!name || !/^[a-zA-Z0-9_-]{1,64}$/.test(name))
    throw new Error("Configure order namespace");
  const store = () => getStore({ name, consistency: "strong" });
  const adapter: ConditionalStore = {
    async get(key) {
      const entry = await store().getWithMetadata(key, {
        type: "json",
        consistency: "strong",
      });
      if (!entry) return null;
      const etag = entry.etag;
      if (!etag) throw new Error("Storage returned no version");
      return { value: entry.data as unknown, etag };
    },
    async set(key, value, condition) {
      return (await store().setJSON(key, value, condition)).modified;
    },
    async keys(prefix) {
      return (await store().list({ prefix })).blobs.map((blob) => blob.key);
    },
  };
  return new OrderRepository(adapter);
}
