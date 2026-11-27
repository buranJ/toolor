# TOOLOR admin on Netlify

The owner-only console is at `https://toolor.store/admin`. It is a separate,
non-indexed route; the store itself has no admin link. Its UI currently uses
Russian. Set `ADMIN_PASSWORD` as a production-only Netlify secret (at least 16
characters) and `CATALOG_STORAGE_DRIVER=netlify` for the production context.
Do not commit either value or send the password through source control. Changing
the password in Netlify and redeploying invalidates every existing 8-hour
session. The browser cookie is HttpOnly, Secure on HTTPS and SameSite=Strict;
write routes also check Origin. Admin API routes require the cookie.

The catalog is stored in a private, site-wide Netlify Blobs store,
`toolor-catalog-production`, separate from order records. No active blob means
the bundled, verified-by-import _mock_ catalog remains in use. The admin can
upload a marketplace `.xlsx` file up to 4 MB and 5,000 rows; the existing
importer's SKU/variant normalization is reused. Duplicate or rejected rows and
invalid links fail the upload rather than replacing part of the catalog.
The `Ассортимент` export is also accepted: `Артикул` groups a product,
`Артикул варианта` identifies its variants, and all rows are imported,
including `Активен: Нет`, as the owner requested. Its zero prices are treated
as unknown rather than free; a valid `Цена со скидкой` becomes the current
price. The preview shows the resulting product and variant counts.
Upload creates a private draft. Signed supplier photo URLs remain in that
private draft only. If a workbook matches the bundled source hash, existing
local optimized photos are reused. Otherwise the admin prepares photos in
batches of three: each source is restricted to known hosts, downloaded with a
size/time limit, converted to 2400px WebP quality 92 without upscaling, and
saved as a content-addressed blob. Only after all photos are ready can the
owner confirm publication. The version record is written first, then the
active pointer changes. Old versions stay in the store, but **there is no
rollback button yet**. The published catalog has no supplier photo URLs.

The product priority list controls the default catalog order and the first six
homepage featured products. Collection priority controls filter order; source
collection names are retained. Price and availability are still pending
business verification, just as before. Uploading a workbook does not verify
inventory or turn purchase requests into paid orders.

The six category tiles on the homepage have separate photo controls in `/admin`.
An owner can preview, upload and replace each tile with a JPG, PNG, WebP or AVIF
file up to 4 MB, or return it to the current catalog photo. The server checks
the decoded image, bounds it to 40 megapixels, and saves a 2400px WebP at
quality 92 in the same private Blobs store. Each tile points to its own
content-addressed photo, so replacing one does not affect the catalog or other
tiles. The homepage reads the current tile pointers on each request. Uploaded
photos persist across Netlify deployments; older images are not pruned yet.

The store is read by server-rendered catalog pages and by checkout's existing
commerce-provider contract. Admin changes persist across Netlify deployments.
Next navigation may keep an already-open client page in memory; refresh the
storefront after publishing. The 2,000-product / 2,000-photo cap is deliberate.
Netlify's 6 MB buffered request limit motivates the 4 MB workbook limit; a
large photo import can take minutes and requires the admin tab to remain open.
Photos that return HTTP 404 or 410 are counted in the draft and omitted from
the published product; other network and processing errors stop preparation
until the source is corrected. Monitor Netlify Blobs and Functions usage if the
catalog grows.

This is an owner-only first release, not a multi-user CMS. It does not include
role management, an audit UI, image cropping, collection text editing or
automatic pruning of old blobs. Set a strong temporary password and rotate it
after acceptance testing; do not use the Telegram bot token as the password.
