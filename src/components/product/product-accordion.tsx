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
            <small>01</small>
            Описание
          </span>
          <AccordionIcon />
        </summary>
        <div className="product-accordion-panel">
          <p>{product.description || "Описание не указано в источнике."}</p>
        </div>
      </details>

      <details className="product-accordion">
        <summary>
          <span>
            <small>02</small>
            Материалы и уход
          </span>
          <AccordionIcon />
        </summary>
        <div className="product-accordion-panel">
          <dl>
            <div>
              <dt>Материал</dt>
              <dd>{product.material || "Не указан в источнике"}</dd>
            </div>
            <div>
              <dt>Уход</dt>
              <dd>{product.care || "Не указан в источнике"}</dd>
            </div>
          </dl>
        </div>
      </details>

      <details className="product-accordion">
        <summary>
          <span>
            <small>03</small>
            Размер и модель
          </span>
          <AccordionIcon />
        </summary>
        <div className="product-accordion-panel">
          <dl>
            <div>
              <dt>Размеры</dt>
              <dd>{product.sizes?.join(", ") || "Не указаны в источнике"}</dd>
            </div>
            <div>
              <dt>Модель</dt>
              <dd>{product.modelInformation || "Не указана в источнике"}</dd>
            </div>
          </dl>
        </div>
      </details>

      <details className="product-accordion">
        <summary>
          <span>
            <small>04</small>
            Доставка и возврат
          </span>
          <AccordionIcon />
        </summary>
        <div className="product-accordion-panel">
          <p>
            Условия доставки и возврата отсутствуют в workbook и требуют
            подтверждения магазина.
          </p>
        </div>
      </details>
    </div>
  );
}
