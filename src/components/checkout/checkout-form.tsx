"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { EmptyState } from "@/components/ui/empty-state";
import {
  LOCAL_CART_KEY,
  readLocalCart,
  writeLocalCart,
} from "@/features/cart/local-cart";
import {
  checkoutReplySchema,
  checkoutRequestSchema,
  customerSchema,
  requestNumber,
} from "@/features/checkout/schema";
import {
  format,
  getDictionary,
  localePath,
  type Dictionary,
  type Locale,
} from "@/i18n";
import { formatMoney } from "@/lib/utils";

const DELIVERY_OPTIONS = [
  { id: "bishkek", titleKey: "bishkekTitle", noteKey: "bishkekNote" },
  { id: "regions", titleKey: "regionsTitle", noteKey: "regionsNote" },
  {
    id: "international",
    titleKey: "internationalTitle",
    noteKey: "internationalNote",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  titleKey: keyof Dictionary["checkout"]["deliveryOptions"];
  noteKey: keyof Dictionary["checkout"]["deliveryOptions"];
}>;

type Errors = Partial<
  Record<
    "name" | "phone" | "email" | "city" | "address" | "comment" | "consent",
    string
  >
>;

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function CheckoutForm({ locale }: { locale: Locale }) {
  const d = getDictionary(locale);
  const copy = d.checkout;
  const snapshot = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener("toolor-cart-change", onStoreChange);
      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener("toolor-cart-change", onStoreChange);
      };
    },
    () => window.localStorage.getItem(LOCAL_CART_KEY) ?? "",
    () => "",
  );
  const items = useMemo(() => readLocalCart(snapshot), [snapshot]);
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0),
    [items],
  );
  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    comment: "",
    delivery: DELIVERY_OPTIONS[0].id as string,
  });
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const submitLock = useRef(false);
  const attempt = useRef<{ fingerprint: string; id: string } | null>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (orderNumber) {
      window.scrollTo({ top: 0 });
      successHeading.current?.focus();
    }
  }, [orderNumber]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): Errors {
    const next: Errors = {};
    // Build the same contact object as the server, without form-only fields.
    const checked = customerSchema.safeParse({
      name: form.name,
      phone: form.phone,
      email: form.email.trim(),
      city: form.city,
      address: form.address,
      comment: form.comment,
    });
    if (!checked.success)
      for (const issue of checked.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && key in copy.errors)
          next[key as keyof Errors] =
            copy.errors[key as keyof typeof copy.errors];
      }
    if (!consent) next.consent = copy.errors.consent;
    return next;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || uncertain) return;
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const first = event.currentTarget.elements.namedItem(
        Object.keys(nextErrors)[0],
      );
      if (first instanceof HTMLElement) first.focus();
      return;
    }
    const details = {
      locale,
      customer: {
        name: form.name,
        phone: form.phone,
        email: form.email.trim(),
        city: form.city,
        address: form.address,
        comment: form.comment,
      },
      delivery: form.delivery,
      consent,
      website,
      items: items.map((item) => ({
        productId: item.productId,
        slug: item.slug,
        variantId: item.variantId,
        quantity: item.quantity,
        expectedUnitAmount: item.unitAmount,
      })),
    };
    const fingerprint = JSON.stringify(details);
    if (attempt.current?.fingerprint !== fingerprint)
      attempt.current = { fingerprint, id: crypto.randomUUID() };
    const id = attempt.current.id;
    const payload = checkoutRequestSchema.safeParse({
      ...details,
      requestId: id,
    });
    if (!payload.success) {
      setSubmitError(copy.submitError);
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/order-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.data),
        signal: AbortSignal.timeout(20_000),
      });
      const reply = checkoutReplySchema.parse(await response.json());
      if (!reply.ok && !response.ok) {
        const messages: Record<string, string> = {
          not_configured: copy.notConfigured,
          cart_changed: copy.cartChanged,
          rate_limited: copy.rateLimited,
        };
        if (reply.code === "delivery_uncertain") throw new Error("uncertain");
        setSubmitError(messages[reply.code] ?? copy.submitError);
        return;
      }
      if (!response.ok || !reply.ok || reply.number !== requestNumber(id))
        throw new Error("uncertain");
      setOrderNumber(reply.number);
      try {
        // Preserve items added in another tab while this request was in flight.
        const current = readLocalCart(
          window.localStorage.getItem(LOCAL_CART_KEY),
        );
        writeLocalCart(
          current.flatMap((line) => {
            const sent = payload.data.items.find(
              (item) =>
                item.variantId === line.variantId &&
                item.productId === line.productId,
            );
            const quantity = line.quantity - (sent?.quantity ?? 0);
            return quantity > 0 ? [{ ...line, quantity }] : [];
          }),
        );
      } catch {
        // Telegram has confirmed receipt. A storage failure must not offer a
        // second send or misrepresent an already delivered request as failed.
      }
    } catch {
      setUncertain(true);
      setSubmitError(
        format(copy.deliveryUncertain, { number: requestNumber(id) }),
      );
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  if (orderNumber) {
    return (
      <div className="mx-auto max-w-xl py-6 text-center md:py-12">
        <span className="bg-brand mx-auto grid size-16 place-items-center rounded-full text-white">
          <CheckIcon />
        </span>
        <h2 ref={successHeading} tabIndex={-1} className="section-serif mt-8">
          {copy.successTitle}
        </h2>
        <p className="text-ink mt-4 text-lg font-medium break-words">
          {format(copy.orderNumber, { number: orderNumber })}
        </p>
        <p className="text-muted mx-auto mt-4 max-w-md text-base leading-7">
          {copy.successText}
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            className="bg-brand hover:bg-brand-strong flex min-h-12 items-center justify-center rounded-full px-7 text-sm font-medium text-white transition-colors"
            href={localePath(locale, "/catalog")}
          >
            {copy.continueShopping}
          </Link>
          <Link
            className="border-ink/80 hover:bg-ink flex min-h-12 items-center justify-center rounded-full border px-7 text-sm font-medium transition-colors hover:text-white"
            href={localePath(locale, "/")}
          >
            {d.common.home}
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        action={{
          href: localePath(locale, "/catalog"),
          label: d.cart.goToCatalog,
        }}
        description={copy.emptyDescription}
        locale={locale}
        title={d.cart.emptyTitle}
      />
    );
  }

  return (
    <form
      className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(21rem,0.85fr)]"
      noValidate
      onSubmit={handleSubmit}
      aria-busy={submitting}
    >
      <fieldset
        className="min-w-0 space-y-6"
        disabled={submitting || uncertain}
      >
        <div
          aria-hidden="true"
          className="absolute -left-[10000px] h-px w-px overflow-hidden"
        >
          <label>
            {copy.honeypot}
            <input
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </label>
        </div>
        {/* Contacts */}
        <section className="checkout-card">
          <h2 className="checkout-card-title">{copy.contacts}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="checkout-field sm:col-span-2">
              <span>{copy.fullName}</span>
              <input
                autoComplete="name"
                data-invalid={Boolean(errors.name)}
                name="name"
                required
                maxLength={100}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={
                  errors.name ? "checkout-name-error" : undefined
                }
                onChange={(event) => set("name", event.target.value)}
                placeholder={copy.fullNamePlaceholder}
                type="text"
                value={form.name}
              />
              {errors.name ? (
                <em id="checkout-name-error">{errors.name}</em>
              ) : null}
            </label>
            <label className="checkout-field">
              <span>{copy.phone}</span>
              <input
                autoComplete="tel"
                data-invalid={Boolean(errors.phone)}
                inputMode="tel"
                name="phone"
                required
                maxLength={30}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={
                  errors.phone ? "checkout-phone-error" : undefined
                }
                onChange={(event) => set("phone", event.target.value)}
                placeholder={copy.phonePlaceholder}
                type="tel"
                value={form.phone}
              />
              {errors.phone ? (
                <em id="checkout-phone-error">{errors.phone}</em>
              ) : null}
            </label>
            <label className="checkout-field">
              <span>{copy.email}</span>
              <input
                autoComplete="email"
                name="email"
                maxLength={254}
                aria-invalid={Boolean(errors.email)}
                data-invalid={Boolean(errors.email)}
                aria-describedby={
                  errors.email ? "checkout-email-error" : undefined
                }
                onChange={(event) => set("email", event.target.value)}
                placeholder={copy.emailPlaceholder}
                type="email"
                value={form.email}
              />
              {errors.email ? (
                <em id="checkout-email-error">{errors.email}</em>
              ) : null}
            </label>
          </div>
        </section>

        {/* Delivery */}
        <section className="checkout-card">
          <h2 className="checkout-card-title">{copy.delivery}</h2>
          <div className="mt-6 grid gap-3">
            {DELIVERY_OPTIONS.map((option) => (
              <label
                className="checkout-choice"
                data-checked={form.delivery === option.id}
                key={option.id}
              >
                <input
                  checked={form.delivery === option.id}
                  className="sr-only"
                  name="delivery"
                  onChange={() => set("delivery", option.id)}
                  type="radio"
                  value={option.id}
                />
                <span aria-hidden="true" className="checkout-choice-dot" />
                <span className="min-w-0">
                  <strong>{copy.deliveryOptions[option.titleKey]}</strong>
                  <small>{copy.deliveryOptions[option.noteKey]}</small>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-[0.8fr_1.2fr]">
            <label className="checkout-field">
              <span>{copy.city}</span>
              <input
                autoComplete="address-level2"
                data-invalid={Boolean(errors.city)}
                name="city"
                required
                maxLength={100}
                aria-invalid={Boolean(errors.city)}
                aria-describedby={
                  errors.city ? "checkout-city-error" : undefined
                }
                onChange={(event) => set("city", event.target.value)}
                placeholder={copy.cityPlaceholder}
                type="text"
                value={form.city}
              />
              {errors.city ? (
                <em id="checkout-city-error">{errors.city}</em>
              ) : null}
            </label>
            <label className="checkout-field">
              <span>{copy.address}</span>
              <input
                autoComplete="street-address"
                data-invalid={Boolean(errors.address)}
                name="address"
                required
                maxLength={300}
                aria-invalid={Boolean(errors.address)}
                aria-describedby={
                  errors.address ? "checkout-address-error" : undefined
                }
                onChange={(event) => set("address", event.target.value)}
                placeholder={copy.addressPlaceholder}
                type="text"
                value={form.address}
              />
              {errors.address ? (
                <em id="checkout-address-error">{errors.address}</em>
              ) : null}
            </label>
            <label className="checkout-field sm:col-span-2">
              <span>{copy.comment}</span>
              <input
                name="comment"
                maxLength={1000}
                aria-invalid={Boolean(errors.comment)}
                data-invalid={Boolean(errors.comment)}
                aria-describedby={
                  errors.comment ? "checkout-comment-error" : undefined
                }
                onChange={(event) => set("comment", event.target.value)}
                placeholder={copy.commentPlaceholder}
                type="text"
                value={form.comment}
              />
              {errors.comment ? (
                <em id="checkout-comment-error">{errors.comment}</em>
              ) : null}
            </label>
          </div>
          <p className="text-muted mt-5 text-sm leading-6">
            {copy.deliveryNote}
          </p>
        </section>

        {/* Payment */}
        <section className="checkout-card">
          <h2 className="checkout-card-title">{copy.payment}</h2>
          <p className="text-muted mt-4 text-sm leading-6">
            {copy.paymentNote}
          </p>
        </section>

        <label className="flex items-start gap-3 text-sm leading-6">
          <input
            className="mt-1 size-4 shrink-0 accent-blue-700"
            name="consent"
            type="checkbox"
            required
            checked={consent}
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={
              errors.consent ? "checkout-consent-error" : undefined
            }
            onChange={(event) => {
              setConsent(event.target.checked);
              setErrors((previous) => ({ ...previous, consent: undefined }));
            }}
          />
          <span>{copy.consent}</span>
        </label>
        {errors.consent ? (
          <p
            id="checkout-consent-error"
            role="alert"
            className="text-sm text-red-700"
          >
            {errors.consent}
          </p>
        ) : null}
        {submitError ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 break-words text-red-800"
          >
            {submitError}
          </p>
        ) : null}

        <button
          className="bg-brand hover:bg-brand-strong flex min-h-[3.4rem] w-full items-center justify-center rounded-full px-6 text-[0.95rem] font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting || uncertain}
          type="submit"
        >
          {submitting
            ? copy.submitting
            : format(copy.submit, {
                price: formatMoney(
                  { amount: subtotal, currencyCode: "KGS" },
                  locale,
                ),
              })}
        </button>
        <p className="text-muted text-center text-xs leading-relaxed">
          {copy.terms}
        </p>
      </fieldset>

      {/* Summary */}
      <aside className="h-fit rounded-[1.5rem] bg-white p-6 shadow-[var(--shadow-soft)] md:p-8 lg:sticky lg:top-24">
        <p className="eyebrow text-muted">{copy.yourOrder}</p>
        <ul className="divide-line mt-6 divide-y">
          {items.map((item) => (
            <li className="flex items-center gap-4 py-4" key={item.variantId}>
              <span className="bg-stone relative block aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-lg">
                <ResilientEditorialImage
                  images={(
                    item.imageUrls ?? (item.imageUrl ? [item.imageUrl] : [])
                  ).map((url, index) => ({
                    id: `${item.variantId}-${index}`,
                    url,
                    alt: item.name,
                  }))}
                  sizes="56px"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-ink line-clamp-2 block text-sm font-medium">
                  {item.name}
                </span>
                <span className="text-muted mt-0.5 block text-xs">
                  {item.variantTitle || "—"} · {item.quantity} {d.common.pieces}
                </span>
              </span>
              <span className="text-sm font-medium whitespace-nowrap">
                {formatMoney(
                  {
                    amount: item.unitAmount * item.quantity,
                    currencyCode: "KGS",
                  },
                  locale,
                )}
              </span>
            </li>
          ))}
        </ul>
        <dl className="border-line mt-2 space-y-3 border-t pt-5 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted">
              {format(d.cart.itemsCount, { count: itemCount })}
            </dt>
            <dd>
              {formatMoney({ amount: subtotal, currencyCode: "KGS" }, locale)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted">{d.cart.delivery}</dt>
            <dd className="text-muted">{d.cart.onConfirmation}</dd>
          </div>
        </dl>
        <div className="border-line mt-5 flex items-baseline justify-between gap-4 border-t pt-5">
          <span className="text-sm font-semibold">{d.cart.total}</span>
          <span className="text-2xl font-medium tracking-[-0.02em]">
            {formatMoney({ amount: subtotal, currencyCode: "KGS" }, locale)}
          </span>
        </div>
        <Link
          className="link-underline text-muted mt-6 inline-block pb-0.5 text-sm"
          href={localePath(locale, "/cart")}
        >
          {copy.editOrder}
        </Link>
      </aside>
    </form>
  );
}
