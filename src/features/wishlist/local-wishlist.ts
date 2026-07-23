export const LOCAL_WISHLIST_KEY = "toolor-wishlist-v1";

/** Parse the persisted wishlist — an array of product ids. */
export function readLocalWishlist(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function writeLocalWishlist(ids: string[]) {
  window.localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("toolor-wishlist-change"));
}
