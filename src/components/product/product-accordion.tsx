import { getDictionary, type Locale } from "@/i18n";
import type { Product } from "@/types";

type AccordionProduct = Pick<
  Product,
  "description" | "material" | "care" | "modelInformation" | "sizes"
>;

function AccordionIcon() {
  return (
    <span aria-hidden="true" className="product-accordion-icon">
      <i />
      <i />
    </span>
  );
}

export function ProductAccordion({
  locale,
  product,
}: {
  locale: Locale;
  product: AccordionProduct;
}) {
  const copy = getDictionary(locale).product.accordion;

  return (
    <div className="product-accordions">
      <details className="product-accordion" open>
        <summary>
          <span>{copy.description}</span>
          <AccordionIcon />
        </summary>
        <div className="product-accordion-panel">
          {/* Product copy comes from the imported workbook and is not
              translated — only the fallback is. */}
          <p>{product.description || copy.descriptionFallback}</p>
        </div>
      </details>

      <details className="product-accordion">
        <summary>
          <span>{copy.materialsCare}</span>
          <AccordionIcon />
        </summary>
        <div className="product-accordion-panel">
          <dl>
            <div>
              <dt>{copy.material}</dt>
              <dd>{product.material || "—"}</dd>
            </div>
            <div>
              <dt>{copy.care}</dt>
              <dd>{product.care || "—"}</dd>
            </div>
          </dl>
        </div>
      </details>

      <details className="product-accordion">
        <summary>
          <span>{copy.sizeModel}</span>
          <AccordionIcon />
        </summary>
        <div className="product-accordion-panel">
          <dl>
            <div>
              <dt>{copy.sizes}</dt>
              <dd>{product.sizes?.join(", ") || "—"}</dd>
            </div>
            <div>
              <dt>{copy.model}</dt>
              <dd>{product.modelInformation || "—"}</dd>
            </div>
          </dl>
        </div>
      </details>

      <details className="product-accordion">
        <summary>
          <span>{copy.deliveryReturns}</span>
          <AccordionIcon />
        </summary>
        <div className="product-accordion-panel">
          <p>{copy.deliveryReturnsText}</p>
        </div>
      </details>
    </div>
  );
}
