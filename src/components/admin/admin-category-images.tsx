"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { Dictionary } from "@/i18n";

export type CategoryTile = {
  key: keyof Dictionary["home"]["categoryMosaic"]["items"];
  label: string;
  image: string | null;
  custom: boolean;
};

type Copy = Dictionary["admin"];

async function checkResponse(response: Response) {
  const value: unknown = await response.json();
  if (response.ok) return;
  const error =
    value &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "string"
      ? value.error
      : "Request failed";
  throw new Error(error);
}

function CategoryImageEditor({
  tile,
  copy,
  busy,
  onSave,
  onReset,
}: {
  tile: CategoryTile;
  copy: Copy;
  busy: boolean;
  onSave: (file: File) => Promise<boolean>;
  onReset: () => Promise<boolean>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  function select(next: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next ? URL.createObjectURL(next) : null;
    if (!next && inputRef.current) inputRef.current.value = "";
    setFile(next);
    setPreview(previewRef.current);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#dce1e7] bg-white">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#eef1f4]">
        {preview || tile.image ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
            src={preview ?? tile.image ?? ""}
            unoptimized={Boolean(preview)}
          />
        ) : (
          <span className="flex h-full items-center justify-center text-sm text-[#647084]">
            {copy.categoryPhotoNoImage}
          </span>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">{tile.label}</h3>
          <span className="text-xs text-[#647084]">
            {tile.custom
              ? copy.categoryPhotoCustom
              : copy.categoryPhotoAutomatic}
          </span>
        </div>
        <label
          className="block text-sm font-medium"
          htmlFor={`category-photo-${tile.key}`}
        >
          {copy.categoryPhotoChoose}
        </label>
        <input
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="w-full min-w-0 rounded-xl border border-[#d5dce5] p-2 text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-[#eef2ff] file:px-3 file:py-2 file:text-[#1544b3]"
          disabled={busy}
          id={`category-photo-${tile.key}`}
          onChange={(event) => select(event.target.files?.[0] ?? null)}
          ref={inputRef}
          type="file"
        />
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-xl bg-[#1544b3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d348e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1544b3] disabled:opacity-50"
            disabled={!file || busy}
            onClick={() => {
              if (file)
                void onSave(file).then((saved) => {
                  if (saved) select(null);
                });
            }}
            type="button"
          >
            {copy.categoryPhotoSave}
          </button>
          {tile.custom ? (
            <button
              className="rounded-xl border border-[#c8d0dc] px-4 py-2 text-sm font-medium hover:bg-[#eef2ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1544b3] disabled:opacity-50"
              disabled={busy}
              onClick={() => void onReset().then((reset) => {
                if (reset) select(null);
              })}
              type="button"
            >
              {copy.categoryPhotoReset}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AdminCategoryImages({
  tiles,
  copy,
  onChanged,
}: {
  tiles: CategoryTile[];
  copy: Copy;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function perform(action: () => Promise<void>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      await onChanged();
      setMessage(success);
      return true;
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : copy.requestFailed);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="mb-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8"
      aria-labelledby="admin-category-photos-title"
    >
      <h2 className="text-2xl font-semibold" id="admin-category-photos-title">
        {copy.categoryPhotosTitle}
      </h2>
      <p className="mt-2 mb-6 text-sm text-[#647084]">
        {copy.categoryPhotosHint}
      </p>
      {error ? (
        <p aria-live="assertive" className="mb-4 text-sm text-[#821d2a]">
          {error}
        </p>
      ) : null}
      {message ? (
        <p aria-live="polite" className="mb-4 text-sm text-[#144f30]">
          {message}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tiles.map((tile) => (
          <CategoryImageEditor
            busy={busy}
            copy={copy}
            key={tile.key}
            onReset={() =>
              perform(async () => {
                await checkResponse(
                  await fetch("/api/admin/category-images", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key: tile.key }),
                  }),
                );
              }, copy.categoryPhotoResetDone)
            }
            onSave={(file) =>
              perform(async () => {
                const form = new FormData();
                form.set("key", tile.key);
                form.set("file", file);
                await checkResponse(
                  await fetch("/api/admin/category-images", {
                    method: "POST",
                    body: form,
                  }),
                );
              }, copy.categoryPhotoSaved)
            }
            tile={tile}
          />
        ))}
      </div>
    </section>
  );
}
