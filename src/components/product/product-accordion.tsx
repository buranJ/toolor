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

export function ProductAccordion({ product }: { product: AccordionProduct }) {
  return (
    <div className="product-accordions">
      <details className="product-accordion" open>
        <summary>
          <span>
            Описание
          </span>
          <AccordionIcon />
        </summary>
        <div className="product-accordion-panel">
          <p>{product.description || "Изделие из коллекции TOOLOR."}</p>
        </div>
      </details>

      <details className="product-accordion">
        <summary>
          <span>
            Материалы и уход
          </span>
          <AccordionIcon />
        </summary>
        <div className="product-accordion-panel">
          <dl>
            <div>
              <dt>Материал</dt>
              <dd>{product.material || "—"}</dd>
            </div>
            <div>
              <dt>Уход</dt>
              <dd>{product.care || "—"}</dd>
            </div>
          </dl>
        </div>
      </details>

      <details className="product-accordion">
        <summary>
          <span>
            Размер и модель
          </span>
          <AccordionIcon />
        </summary>
        <div className="product-accordion-panel">
          <dl>
            <div>
              <dt>Размеры</dt>
              <dd>{product.sizes?.join(", ") || "—"}</dd>
            </div>
            <div>
              <dt>Модель</dt>
              <dd>{product.modelInformation || "—"}</dd>
            </div>
          </dl>
        </div>
      </details>

      <details className="product-accordion">
        <summary>
          <span>
            Доставка и возврат
          </span>
          <AccordionIcon />
        </summary>
        <div className="product-accordion-panel">
          <p>
            Доставка по Кыргызстану и за рубеж. Обмен и возврат — согласно
            правилам магазина.
          </p>
        </div>
      </details>
    </div>
  );
}
