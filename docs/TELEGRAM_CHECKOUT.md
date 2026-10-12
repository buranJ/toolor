# Telegram purchase requests

## Status and scope

The user approved a temporary, request-only checkout on 2026-10-08. The website
collects name, phone, optional email, requested delivery option, city, address,
comment and cart lines. After explicit consent, its server stores the request
and sends these details to one configured Telegram chat. On 2026-10-12 the owner
approved durable history on Netlify and one employee working only in Telegram.
Online payment is not implemented.
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

The notification-only bot needs no polling daemon or webhook to send purchase requests: the
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

## Telegram order management on Netlify

Configure these **server-only production** environment variables, then redeploy:

- `ORDER_STORAGE_DRIVER=netlify`
- `ORDER_STORAGE_NAMESPACE=toolor-orders-production`
- `TELEGRAM_OPERATOR_ID`: the numeric ID of the single authorized employee.
- `TELEGRAM_CHAT_ID`: the same private numeric chat ID. Group/topic management is
  deliberately not enabled; leave `TELEGRAM_MESSAGE_THREAD_ID` empty.
- `TELEGRAM_WEBHOOK_SECRET`: a privately generated random string, 32–256 ASCII
  letters/digits/underscores/hyphens. Never expose it in browser assets or logs.
- `TELEGRAM_BOT_TOKEN`: the existing dedicated bot credential.

Use a different namespace and bot for previews; don't copy production credentials
into deploy previews. Site-wide Blobs otherwise spans deploy contexts. An empty
storage driver keeps the legacy notification-only mode for local tests; an
unknown nonempty driver or unavailable configured storage fails closed.

After the production route exists, run `pnpm telegram:enable-orders` with the same
private environment settings. This registers `/start`, `/orders`, `/new` and the
HTTPS webhook with its secret header. It refuses to replace a different webhook
and preserves pending updates. It is not a build hook. No always-running bot
process is needed on Netlify: Telegram calls the server route when the employee
sends a command or presses a button.

`/start` opens the work panel. `/orders` shows newest-first history, ten results
per page, with status filters and full request cards on demand. New cards have
**Take into work → Mark shipped → Complete** buttons. Cancellation requires a
separate confirmation and is allowed before shipment. Each change saves its UTC
time and operator ID, updates the card and replaces the action buttons. Older
buttons/repeated events cannot overwrite newer state. Requests received before
this storage feature was enabled remain in Telegram but are **not imported**.

The webhook checks its secret before parsing input, bounds streamed input to
64 KiB/five seconds, and verifies both private chat and sender ID before accessing
history. It returns generic errors and no customer records. Staff copy is Russian;
the storefront's storage/sharing consent is translated into all three languages.
Full names remain in order cards; short history previews are bounded for Telegram.

Storage schema version 1 holds server-resolved catalogue/contact snapshots,
workflow revision, notification outcome, message ID and status audit. Each UUID
has a conditional immutable `references/` claim containing an initial snapshot
and an `orders/` current record. Both contain personal data: future deletion,
backup, export and migration must cover **both** prefixes. Strong reads and
ETag-conditional writes guard concurrent cold starts and workflow changes.
Notification receipt writes do not invalidate already visible action buttons.
History reads are batched and bounded per interaction; all pages remain reachable.

## Important limitations before public launch

When the approved storage driver is configured, snapshots and status history
persist across functions, restarts and site deploys. Per-process request IDs also coalesce concurrent identical submissions and
retain successful/ambiguous outcomes for 30 minutes (at most 1024 entries).
Changed payloads cannot reuse a durable reference. Best-effort rate limits allow
three attempts per normalized phone per ten minutes and twenty per process per
minute, with bounded hash-only buckets. These limits do **not** span Netlify
instances, restarts, deploys or multiple self-hosted processes. They are not
robust anti-spam protection or an exactly-once guarantee.

The durable record is claimed before contacting Telegram. A failed storage write
cannot produce a successful checkout or clear the cart. Successful delivery is
reused across instances; only an explicit Telegram rejection permits another
dispatch. Timeout/network failure or a crash between dispatch and saving its
receipt remains uncertain and is **not automatically resent**. Check its full
reference in history and the recipient chat before taking any recovery action.
There is no scheduled outbox worker or automatic recovery sweep. Telegram and
Blobs are not one transaction; exactly-once notification is not claimed.

Before accepting real public orders, agree on outbox recovery,
distributed/edge abuse protection (and whether a CAPTCHA is appropriate),
failure monitoring, operator access, retention/deletion rules and customer
privacy information about storage and Telegram. Revoke the exposed test token
before accepting real customers and configure the employee's private account.
The site must not claim an order was paid, reserved or confirmed.

## Later move to the company computer

The Next.js routes and bot presentation remain portable. Netlify Blobs credentials
and runtime context must not be copied as though they were local files. Before
switching the domain, choose and implement a durable self-hosted adapter for
`ConditionalStore`, privately export/import both record prefixes, verify counts
and workflow history with synthetic orders, and arrange backups. Quiesce checkout
and bot changes during the final export so orders cannot be split between hosts.
Only switch the webhook after the new HTTPS endpoint and operator authorization
are verified. OS, ingress/firewall, uptime, autostart and backup setup must be
checked on the actual machine. A local adapter/export tool is not yet implemented;
the hosting migration is a separate step, not an automatic consequence of cloning.

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

Local verification on 2026-10-12: lint, strict TypeScript, all 100 unit/component
tests and the production build passed. All 72 checkout/store/i18n browser cases
passed in Chromium, WebKit and Firefox. New tests cover concurrent durable claims,
conditional workflow updates, stale/repeated callbacks, crash recovery, storage
failure before dispatch, persistence after service recreation, unauthorized access,
secret-header/body validation, pagination and expired callback acknowledgements.
The configured bot/webhook secrets were absent from generated browser assets.
Production deployment and an actual employee button click require separate
end-to-end verification; these tests mock Telegram and durable storage.
