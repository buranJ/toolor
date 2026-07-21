import Link from "next/link";

import { categoryMarqueeItems } from "@/data/category-marquee";

type CategoryIconName = (typeof categoryMarqueeItems)[number]["icon"];

function CategoryIcon({ name }: { name: CategoryIconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" {...common}>
      {name === "women" ? (
        <>
          <path d="M24 13h16l3 10-5 5 6 24H20l6-24-5-5 3-10Z" />
          <path d="m27 13 5 8 5-8M26 28h12M22 44h20" />
        </>
      ) : null}
      {name === "men" ? (
        <>
          <path d="m21 15 7-4h8l7 4 7 8-6 5-3-4v29H23V24l-3 4-6-5 7-8Z" />
          <path d="m28 11 4 8 4-8M32 19v34M26 30h12" />
        </>
      ) : null}
      {name === "cap" ? (
        <>
          <path d="M14 35c1-12 8-20 20-20 10 0 17 6 18 16-12-2-24 0-38 4Z" />
          <path d="M14 35c13-2 26-1 36 3 3 1 2 5-1 5H32c-8 0-14-3-18-8ZM34 15v16" />
        </>
      ) : null}
      {name === "scarf" ? (
        <>
          <path d="M18 14c8 5 20 5 28 0l-3 16 5 23-12-7-4 7-5-22-9-17Z" />
          <path d="m27 31 5-9 11 8M36 46l-4-24" />
        </>
      ) : null}
      {name === "trousers" ? (
        <>
          <path d="M22 12h20l3 41H34l-2-24-2 24H19l3-41Z" />
          <path d="M22 20h20M32 12v17M26 16h2M36 16h2" />
        </>
      ) : null}
      {name === "tshirt" ? (
        <>
          <path d="m23 14 6-3h6l6 3 10 7-7 10-4-3v25H24V28l-4 3-7-10 10-7Z" />
          <path d="M27 12c1 5 9 5 10 0M24 38h16" />
        </>
      ) : null}
      {name === "jacket" ? (
        <>
          <path d="m23 13 6-3h6l6 3 9 9-6 8-4-4v27H24V26l-4 4-6-8 9-9Z" />
          <path d="M29 11 32 20l3-9M32 20v33M25 30h14M25 39h14M28 46h-4M36 46h4" />
        </>
      ) : null}
      {name === "all" ? (
        <>
          <rect height="15" rx="3" width="15" x="14" y="14" />
          <rect height="15" rx="3" width="15" x="35" y="14" />
          <rect height="15" rx="3" width="15" x="14" y="35" />
          <rect height="15" rx="3" width="15" x="35" y="35" />
        </>
      ) : null}
    </svg>
  );
}

function CategoryItem({
  item,
  duplicate = false,
}: {
  item: (typeof categoryMarqueeItems)[number];
  duplicate?: boolean;
}) {
  const content = (
    <>
      <span
        className={`category-marquee-image category-marquee-icon ${item.icon === "all" ? "category-marquee-image-all" : ""}`}
      >
        <span aria-hidden="true" className="category-icon-accent" />
        <CategoryIcon name={item.icon} />
      </span>
      <span className="category-marquee-label">{item.label}</span>
    </>
  );

  return (
    <li className="category-marquee-item">
      {duplicate ? (
        <span className="group block" aria-hidden="true">
          {content}
        </span>
      ) : (
        <Link className="group block" href={item.href}>
          {content}
        </Link>
      )}
    </li>
  );
}

export function CategoryMarqueeSection() {
  return (
    <section
      aria-label="Выбор категории"
      className="category-marquee-section"
      data-scroll-anchor="category-marquee"
      data-testid="category-marquee"
    >
      <div className="category-marquee-viewport">
        <div className="category-marquee-track">
          <ul className="category-marquee-list">
            {categoryMarqueeItems.map((item) => (
              <CategoryItem item={item} key={item.href} />
            ))}
          </ul>
          <ul aria-hidden="true" className="category-marquee-list">
            {categoryMarqueeItems.map((item) => (
              <CategoryItem duplicate item={item} key={item.href} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
