"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import type { Dictionary } from "@/i18n";

type Copy = Dictionary["admin"];
type ProductRow = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  price: number;
  featured: boolean;
  collectionName: string | null;
};
type CollectionRow = { id: string; name: string; count: number };
type Draft = {
  id: string;
  createdAt: string;
  workbook: string;
  productCount: number;
  variantCount: number;
  imageCount: number;
  preparedCount: number;
  sample: string[];
  preview: { id: string; name: string; sku: string; variants: number }[];
};
type AdminState = {
  active: { id: string; publishedAt: string } | null;
  products: ProductRow[];
  collections: CollectionRow[];
  priorities: { productIds: string[]; collectionIds: string[] };
  draft: Draft | null;
};

async function readResponse<T>(response: Response): Promise<T> {
  const value: unknown = await response.json();
  if (!response.ok) {
    const error =
      value && typeof value === "object" && "error" in value &&
      typeof value.error === "string"
        ? value.error
        : "Request failed";
    throw new Error(error);
  }
  return value as T;
}

function reordered(ids: string[], id: string, destination: number) {
  const next = [...ids];
  const current = next.indexOf(id);
  if (current < 0 || destination < 0 || destination >= next.length) return ids;
  next.splice(current, 1);
  next.splice(destination, 0, id);
  return next;
}

export function AdminDashboard({
  copy: d,
  configured,
  initiallyAuthenticated,
}: {
  copy: Copy;
  configured: boolean;
  initiallyAuthenticated: boolean;
}) {
  const [authenticated, setAuthenticated] = useState(initiallyAuthenticated);
  const [password, setPassword] = useState("");
  const [state, setState] = useState<AdminState | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [productOrder, setProductOrder] = useState<string[]>([]);
  const [collectionOrder, setCollectionOrder] = useState<string[]>([]);

  function applyState(data: AdminState) {
    setState(data);
    setProductOrder(
      data.priorities.productIds.length === data.products.length
        ? data.priorities.productIds
        : data.products.map((product) => product.id),
    );
    setCollectionOrder(
      data.priorities.collectionIds.length === data.collections.length
        ? data.priorities.collectionIds
        : data.collections.map((collection) => collection.id),
    );
  }

  async function refresh() {
    const response = await fetch("/api/admin/catalog", { cache: "no-store" });
    if (response.status === 401) {
      setAuthenticated(false);
      setState(null);
      return;
    }
    applyState(await readResponse<AdminState>(response));
  }

  useEffect(() => {
    if (!initiallyAuthenticated) return;
    void fetch("/api/admin/catalog", { cache: "no-store" })
      .then((response) => readResponse<AdminState>(response))
      .then((data) => applyState(data))
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : d.requestFailed),
      );
    // Only the initial server session needs hydration; later actions call refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initiallyAuthenticated]);

  const productsById = useMemo(
    () => new Map(state?.products.map((item) => [item.id, item]) ?? []),
    [state],
  );
  const collectionsById = useMemo(
    () => new Map(state?.collections.map((item) => [item.id, item]) ?? []),
    [state],
  );
  const visibleProducts = productOrder
    .map((id) => productsById.get(id))
    .filter((item): item is ProductRow => Boolean(item))
    .filter((item) => item.name.toLocaleLowerCase("ru").includes(search.toLocaleLowerCase("ru")));

  async function perform(name: string, action: () => Promise<void>) {
    setBusy(name);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : d.requestFailed);
    } finally {
      setBusy("");
    }
  }

  async function login() {
    await perform("login", async () => {
      await readResponse(await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      }));
      setPassword("");
      setAuthenticated(true);
      await refresh();
    });
  }

  async function logout() {
    await perform("logout", async () => {
      await fetch("/api/admin/logout", { method: "POST" });
      setAuthenticated(false);
      setState(null);
    });
  }

  async function upload() {
    if (!file) return setError(d.selectFile);
    await perform("upload", async () => {
      const form = new FormData();
      form.set("file", file);
      await readResponse(await fetch("/api/admin/catalog/upload", {
        method: "POST",
        body: form,
      }));
      setFile(null);
      await refresh();
    });
  }

  async function prepare() {
    await perform("prepare", async () => {
      for (;;) {
        const response = await readResponse<{ done: boolean; prepared: number; total: number }>(
          await fetch("/api/admin/catalog/prepare", { method: "POST" }),
        );
        setState((current) => current?.draft
          ? { ...current, draft: { ...current.draft, preparedCount: response.prepared } }
          : current);
        if (response.done) break;
      }
      await refresh();
    });
  }

  async function publish() {
    if (!window.confirm(d.publishConfirm)) return;
    await perform("publish", async () => {
      await readResponse(await fetch("/api/admin/catalog/publish", { method: "POST" }));
      await refresh();
      setMessage(d.published);
    });
  }

  async function saveOrder() {
    await perform("order", async () => {
      await readResponse(await fetch("/api/admin/catalog/priorities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: productOrder, collectionIds: collectionOrder }),
      }));
      await refresh();
      setMessage(d.saved);
    });
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1280px] px-4 py-6 sm:px-8 sm:py-10">
      <header className="mb-10 flex items-center justify-between gap-4 border-b border-[#dce1e7] pb-6">
        <div>
          <Link className="text-lg font-bold tracking-[0.22em] text-[#1544b3]" href="/ru">TOOLOR</Link>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#647084]">Admin / 01</p>
        </div>
        {authenticated ? (
          <button className="rounded-full border border-[#c8d0dc] px-5 py-2 text-sm font-medium hover:bg-white focus-visible:outline-2 focus-visible:outline-[#1544b3]" onClick={logout} type="button">
            {d.logout}
          </button>
        ) : null}
      </header>

      {!configured ? (
        <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-sm">{d.notConfigured}</div>
      ) : !authenticated ? (
        <form
          className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-sm sm:p-10"
          onSubmit={(event) => { event.preventDefault(); void login(); }}
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#1544b3]">TOOLOR / ADMIN</p>
          <h1 className="mb-8 text-3xl font-semibold tracking-tight">{d.loginTitle}</h1>
          <label className="mb-2 block text-sm font-medium" htmlFor="admin-password">{d.password}</label>
          <input
            autoComplete="current-password"
            className="w-full rounded-xl border border-[#cbd3de] bg-white px-4 py-3 outline-none focus:border-[#1544b3] focus:ring-2 focus:ring-[#1544b3]/15"
            id="admin-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          <button className="mt-5 w-full rounded-xl bg-[#1544b3] px-5 py-3 font-semibold text-white hover:bg-[#0d348e] disabled:opacity-50" disabled={Boolean(busy)} type="submit">
            {busy ? d.loading : d.login}
          </button>
        </form>
      ) : (
        <main>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#1544b3]">CONTROL PANEL</p>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{d.title}</h1>
              <p className="mt-3 max-w-2xl text-[#647084]">{d.subtitle}</p>
            </div>
            <Link className="rounded-full border border-[#c8d0dc] px-5 py-2 text-sm font-medium hover:bg-white" href="/ru/catalog" target="_blank" rel="noreferrer">{d.catalogLink} ↗</Link>
          </div>

          {state ? (
            <>
              <div className="mb-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-[#1544b3] p-6 text-white"><p className="text-sm text-white/70">{d.currentCatalog}</p><p className="mt-5 text-3xl font-semibold">{state.products.length}</p><p className="text-sm text-white/70">{d.products}</p></div>
                <div className="rounded-2xl bg-white p-6"><p className="text-sm text-[#647084]">{d.collectionsTitle}</p><p className="mt-5 text-3xl font-semibold">{state.collections.length}</p></div>
                <div className="rounded-2xl bg-white p-6"><p className="text-sm text-[#647084]">{d.currentCatalog}</p><p className="mt-5 text-sm font-medium">{state.active ? new Date(state.active.publishedAt).toLocaleString("ru-RU") : d.sourceCatalog}</p></div>
              </div>

              <section className="mb-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8" aria-labelledby="admin-upload-title">
                <div className="mb-6"><h2 id="admin-upload-title" className="text-2xl font-semibold">{d.uploadTitle}</h2><p className="mt-2 text-sm text-[#647084]">{d.uploadHint}</p></div>
                <div className="flex flex-wrap items-center gap-3">
                  <input accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-label={d.selectFile} className="min-w-0 max-w-full rounded-xl border border-[#d5dce5] p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#eef2ff] file:px-4 file:py-2 file:font-medium file:text-[#1544b3]" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
                  <button className="rounded-xl bg-[#1544b3] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0d348e] disabled:opacity-50" disabled={!file || Boolean(busy)} onClick={upload} type="button">{busy === "upload" ? d.loading : d.upload}</button>
                </div>
                {state.draft ? (
                  <div className="mt-8 rounded-2xl border border-[#c7d6f8] bg-[#f4f7ff] p-5">
                    <h3 className="text-lg font-semibold">{d.draftTitle}: {state.draft.workbook}</h3>
                    <p className="mt-1 text-sm text-[#53647c]">{d.draftDescription}</p>
                    <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm"><span>{d.products}: <b>{state.draft.productCount}</b></span><span>{d.variants}: <b>{state.draft.variantCount}</b></span><span>{d.photos}: <b>{state.draft.imageCount}</b></span><span>{d.prepared}: <b>{state.draft.preparedCount}</b></span></div>
                    <p className="mt-4 text-sm text-[#53647c]">{state.draft.sample.join(" · ")}</p>
                    <ol className="mt-4 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-[#d7e1f7] bg-white p-3 text-sm">
                      {state.draft.preview.map((product, index) => (
                        <li className="flex justify-between gap-4" key={product.id}>
                          <span>{index + 1}. {product.name}</span>
                          <span className="shrink-0 text-[#647084]">{product.sku} · {product.variants} {d.variants.toLowerCase()}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="mt-5 flex flex-wrap gap-3">
                      {state.draft.preparedCount < state.draft.imageCount ? (
                        <button className="rounded-xl border border-[#1544b3] px-5 py-3 text-sm font-semibold text-[#1544b3] hover:bg-white disabled:opacity-50" disabled={Boolean(busy)} onClick={prepare} type="button">{busy === "prepare" ? `${d.preparing} ${state.draft.preparedCount}/${state.draft.imageCount}` : d.prepare}</button>
                      ) : null}
                      <button className="rounded-xl bg-[#1544b3] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0d348e] disabled:opacity-50" disabled={Boolean(busy) || state.draft.preparedCount < state.draft.imageCount} onClick={publish} type="button">{d.publish}</button>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8" aria-labelledby="admin-priority-title">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h2 id="admin-priority-title" className="text-2xl font-semibold">{d.priorityTitle}</h2><p className="mt-2 text-sm text-[#647084]">{d.priorityHint}</p></div><button className="rounded-xl bg-[#161b21] px-5 py-3 text-sm font-semibold text-white hover:bg-[#323940] disabled:opacity-50" disabled={Boolean(busy)} onClick={saveOrder} type="button">{d.saveOrder}</button></div>
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div>
                    <label className="mb-2 block text-sm font-medium" htmlFor="admin-search">{d.productSearch}</label>
                    <input className="mb-4 w-full rounded-xl border border-[#cbd3de] px-4 py-3 outline-none focus:border-[#1544b3]" id="admin-search" onChange={(event) => setSearch(event.target.value)} type="search" value={search} />
                    <ol className="max-h-[660px] space-y-2 overflow-y-auto pr-1">
                      {visibleProducts.map((product) => {
                        const index = productOrder.indexOf(product.id);
                        return <li className="flex items-center gap-3 rounded-xl border border-[#e2e7ee] p-2 sm:p-3" key={product.id}>
                          <span className="w-7 shrink-0 text-center text-sm font-semibold text-[#647084]">{index + 1}</span>
                          {product.image ? <Image alt="" className="h-14 w-12 shrink-0 rounded-lg bg-[#eef1f4] object-cover" height={56} src={product.image} width={48} /> : <span className="h-14 w-12 shrink-0 rounded-lg bg-[#eef1f4]" />}
                          <span className="min-w-0 flex-1 truncate text-sm font-medium" title={product.name}>{product.name}</span>
                          <div className="flex shrink-0 gap-1">
                            <button aria-label={`${d.top}: ${product.name}`} className="rounded-lg border border-[#dce1e7] px-2 py-1 text-xs hover:bg-[#eef2ff] disabled:opacity-30" disabled={index === 0} onClick={() => setProductOrder((items) => reordered(items, product.id, 0))} title={d.top} type="button">⇡</button>
                            <button aria-label={`${d.up}: ${product.name}`} className="rounded-lg border border-[#dce1e7] px-2 py-1 text-xs hover:bg-[#eef2ff] disabled:opacity-30" disabled={index === 0} onClick={() => setProductOrder((items) => reordered(items, product.id, index - 1))} title={d.up} type="button">↑</button>
                            <button aria-label={`${d.down}: ${product.name}`} className="rounded-lg border border-[#dce1e7] px-2 py-1 text-xs hover:bg-[#eef2ff] disabled:opacity-30" disabled={index === productOrder.length - 1} onClick={() => setProductOrder((items) => reordered(items, product.id, index + 1))} title={d.down} type="button">↓</button>
                          </div>
                        </li>;
                      })}
                    </ol>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{d.collectionsTitle}</h3>
                    <p className="mt-2 mb-4 text-sm text-[#647084]">{d.collectionsHint}</p>
                    <ol className="space-y-2">
                      {collectionOrder.map((id, index) => {
                        const collection = collectionsById.get(id);
                        if (!collection) return null;
                        return <li className="flex items-center gap-2 rounded-xl border border-[#e2e7ee] p-3" key={id}>
                          <span className="text-sm text-[#647084]">{index + 1}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium" title={collection.name}>{collection.name} <span className="text-[#8b96a4]">({collection.count})</span></span>
                          <button aria-label={`${d.up}: ${collection.name}`} className="rounded-lg border border-[#dce1e7] px-2 py-1 text-xs disabled:opacity-30" disabled={index === 0} onClick={() => setCollectionOrder((items) => reordered(items, id, index - 1))} type="button">↑</button>
                          <button aria-label={`${d.down}: ${collection.name}`} className="rounded-lg border border-[#dce1e7] px-2 py-1 text-xs disabled:opacity-30" disabled={index === collectionOrder.length - 1} onClick={() => setCollectionOrder((items) => reordered(items, id, index + 1))} type="button">↓</button>
                        </li>;
                      })}
                    </ol>
                  </div>
                </div>
              </section>
            </>
          ) : <p>{d.loading}</p>}
        </main>
      )}
      {error ? <p aria-live="assertive" className="fixed right-4 bottom-4 max-w-md rounded-xl bg-[#821d2a] p-4 text-sm text-white shadow-lg">{error}</p> : null}
      {message ? <p aria-live="polite" className="fixed right-4 bottom-4 max-w-md rounded-xl bg-[#144f30] p-4 text-sm text-white shadow-lg">{message}</p> : null}
    </div>
  );
}
