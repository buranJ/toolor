# Commerce model

Product discovery and cart contracts remain backend-neutral through `CommerceProvider`. Money is stored in integer minor units and formatted at presentation boundaries. Variants own SKU, options, price and availability status.

The current mock provider reads its catalog from the Zod-validated generated file `src/data/toolor-products.generated.json`. Names, prices, SKU values, descriptions and product attributes originate from `docs/data-toolor.xlsx`; they are not handwritten fixtures. Inventory was not supplied, so every variant remains `availabilityStatus: unknown` and `availableForSale: false`.

The visible cart uses Zod-validated localStorage records. It has no reservation, delivery calculation, payment, customer identity or cross-device persistence. A production adapter must add those concerns plus provider error mapping, caching and request tracing.
