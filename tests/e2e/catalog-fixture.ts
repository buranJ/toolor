import generated from "../../src/data/toolor-products.generated.json";

/**
 * A real product from the current import. The specs used to pin a slug and a
 * name from the workbook that happened to be loaded at the time, so replacing
 * the catalogue broke three unrelated smoke tests instead of surfacing a bug.
 */
const product = generated.products[0];
if (!product) throw new Error("Imported catalogue has no products to test.");

export const sampleProduct = {
  slug: product.slug,
  name: product.name,
  imageCount: product.images.length,
};
