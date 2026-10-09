# Telegram purchase requests

## Status and scope

The user approved a temporary, request-only checkout on 2026-10-08. The website
collects name, phone, optional email, requested delivery option, city, address,
comment and cart lines. After explicit sharing consent, its server sends these
details to one configured Telegram chat. Online payment is not implemented.
Catalogue price, availability, delivery policies and legal terms remain pending
verification. Operators must confirm them before agreeing to fulfil a request.

Code alone does not register a Telegram bot or grant it access to a group.
Real delivery is not verified until the owner configures a bot and recipient
and confirms receipt of a synthetic test request. No real customer data should
be used for initial testing.

## Owner setup

1. Open the official [@BotFather](https://t.me/BotFather), send `/newbot`, and
   choose a display name and an available username ending in `bot`.
2. Save the authentication token privately. Do not paste it into chat, a
   browser URL, a shell argument, source code or GitHub. Revoke it in BotFather
   if it was exposed. Prefer a dedicated bot instead of reusing another system's.
3. Choose the recipient. For personal notifications, open the new bot and press
   Start. For specialists, create a **private** group, add only approved staff
   and the bot, allow the bot to send messages and send `/start@bot_username`.
   Administrator privileges and disabling privacy mode are not required for
   this outbound notification flow.
4. Copy the variable names from `.env.example` into a local `.env.local` using
   an editor. `.env.local` is ignored by Git; `.env.example` has no real secrets.
   Initially fill only `TELEGRAM_BOT_TOKEN`.
5. Run `pnpm telegram:setup`. This checks the bot, refuses to change an existing
   webhook and prints only discovered chat types and numeric IDs (not messages,
   contact details or the token). It does not advance update offsets. If there
   are several recipients, choose deliberately; do not guess from ID order.
6. Add the chosen `TELEGRAM_CHAT_ID`. `TELEGRAM_MESSAGE_THREAD_ID` is optional
   for a forum topic; leave it empty for ordinary groups/private chats. If no
   chats were found, send a fresh bot command and run discovery again.
7. Restart the local website. For Netlify, set the same variables using the
   site's environment-variable settings with Functions runtime access, then
   redeploy. Never prefix them with `NEXT_PUBLIC_`, and do not put secrets in
   `netlify.toml`. Confirm receipt of one clearly marked synthetic request in
   the intended chat before enabling public use.

The bot needs no polling daemon or webhook to send purchase requests: the
website's Node route calls the HTTPS Bot API on submission. Do not stop another
bot's polling/webhook to run discovery; use a separate bot or coordinate with
its owner instead.

## Behaviour and safety

- Only configured numeric chat/topic IDs are used; a customer cannot select
  the recipient or supply a Telegram token.
- Shared Zod validation bounds fields, lines (20), per-line quantity (20),
  rejects duplicate variants, honeypot content and missing consent. The route
  requires JSON and same-origin/canonical-origin requests and bounds actual
  streamed input to 32 KiB with a five-second read deadline.
- Product, variant, SKU, options and price are re-read through `CommerceProvider`.
  A changed expected price, forged ID or explicitly unavailable variant returns
  an error. Unknown stock remains an operator-confirmed request, not a sale.
- Staff messages use Russian and include the full request ID, UTC timestamp,
  buyer language, supplied contacts/delivery/comment, every variant/SKU/option,
  quantity, catalogue subtotal and product links. No payment is claimed.
- Messages use server-generated Telegram HTML: bold section headings, labelled
  contact/delivery blocks, quoted comments, product links and an emphasized
  subtotal. Full references, exact timestamps, variant IDs and sharing consent
  remain in an expandable reference block. Every dynamic value (including
  catalogue text and link attributes) is escaped; users cannot inject markup.
  UTC is explicit and dates in the main card are human-readable. Link previews
  are disabled. Requests exceeding the conservative text or HTML-source budget
  are sent as one
  complete UTF-8 `.txt` attachment with a reference caption; data is not truncated.
- Success requires a valid successful Telegram response containing `message_id`.
  Only then are submitted cart quantities removed, preserving additions made
  during the request. Inputs stay in the current form on failure; personal
  contacts/addresses are **not** persisted in localStorage or application logs.
- Explicit Telegram rejections leave the form/cart available for retry.
  A timeout/network error after dispatch is ambiguous: Telegram may already
  have accepted it. The UI shows the request reference, retains the cart and
  prevents another send in that mounted form. Neither server nor client
  automatically retries an ambiguous dispatch.
- Token-bearing fetch errors and Telegram response bodies are not logged or
  returned to the visitor. API replies use `Cache-Control: no-store`.

## Important limitations before public launch

This is a direct notification integration, **not durable order storage**. No
database, payment service or new infrastructure dependency was added without
approval. Per-process request IDs coalesce concurrent identical submissions and
retain successful/ambiguous outcomes for 30 minutes (at most 1024 entries).
Changed payloads cannot reuse an active reference. Best-effort rate limits allow
three attempts per normalized phone per ten minutes and twenty per process per
minute, with bounded hash-only buckets. These limits do **not** span Netlify
instances, restarts, deploys or multiple self-hosted processes. They are not
robust anti-spam protection or an exactly-once guarantee.

Before accepting real public orders, agree on durable request storage/outbox,
distributed/edge abuse protection (and whether a CAPTCHA is appropriate),
failure monitoring, operator access, retention/deletion rules and customer
privacy information about Telegram. Without a durable store, an uncertain
delivery must be checked by its reference in the recipient chat before anyone
resubmits; reloading the form or a new server process can otherwise duplicate
it. The site must not claim an order was paid, reserved or confirmed.

## Verification

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, start on port 3100,
then `PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e`.
Transport unit tests mock every Telegram call, even with real environment
variables present. Browser checkout tests intercept the order endpoint and use
synthetic contacts only. They cover validation/consent, no online-card choice,
confirmed receipt, concurrent cart additions, failure retention, ambiguous
delivery lockout, price-change feedback and all three interface languages.

Local verification on 2026-10-08: lint and strict TypeScript passed; all 69
unit/component tests and a production build passed. The clean full browser
run passed 130 cases in Chromium, WebKit and Firefox, with only two existing
non-CDP CPU-emulation cases intentionally skipped. No Telegram credentials
were configured; discovery failed closed with setup instructions. No real
request was sent and nothing was deployed. Outbound Telegram configuration
strings were absent from the generated browser chunks.

Local verification on 2026-10-09: configured the owner's test bot and the
single discovered private recipient after the owner confirmed pressing Start.
Credentials remain in the ignored local environment file. Lint, strict
TypeScript, all 69 unit/component tests, the production build and all 21
checkout browser tests (Chromium, WebKit and Firefox) passed again. One real
end-to-end checkout with explicitly synthetic contacts was submitted through
an isolated browser session: Telegram acknowledged delivery, the success
screen appeared and the test cart was cleared. No automatic resend occurred.
The actual token was absent from generated browser assets. The owner subsequently
confirmed receipt by supplying a screenshot of the test message. Netlify environment
configuration and deployment have not been performed; replace the exposed test
credential before accepting real customer data.

The owner then requested clearer Telegram message styling. The formatted
renderer passed lint, strict TypeScript, all 72 unit/component tests, a production
build and all 21 checkout browser cases. Tests cover dynamic HTML escaping,
missing optional fields, preservation of reference data and complete plain-text
attachments when escaping or markup would exceed the message budget. One new
clearly synthetic browser checkout was accepted by Telegram with the new HTML
format and the website showed success. The local production server remains on
port 3100. No production deployment was performed.

Primary references: [Telegram bot creation](https://core.telegram.org/bots/features#creating-a-new-bot),
[Telegram Bot API](https://core.telegram.org/bots/api#sendmessage),
[Netlify environment variables](https://docs.netlify.com/build/environment-variables/overview/).
