import Image from "next/image";

import { BrandMark } from "@/components/ui/brand-mark";
import { Container } from "@/components/ui/container";
import { APP_STORES, StoreIcon } from "@/components/ui/app-store-links";

export function AppPromoSection() {
  return (
    <section
      className="app-promo-section relative overflow-hidden text-white"
      data-scroll-anchor="app"
      id="app"
    >
      <BrandMark
        animate="none"
        aria-hidden="true"
        className="app-promo-mark"
        variant="white"
      />
      <Container className="relative z-10 py-16 md:py-24 lg:py-28">
        <div className="app-promo-grid">
          <div className="app-promo-copy">
            <h2 className="app-promo-title">
              TOOLOR всегда <span className="serif-italic">с вами.</span>
            </h2>
            <p className="app-promo-description">
              Скачайте официальное приложение TOOLOR для iOS или Android.
              Выберите удобный магазин или наведите камеру на QR-код.
            </p>

            <div
              className="app-store-buttons"
              aria-label="Ссылки на приложение"
            >
              {APP_STORES.map((store) => (
                <a
                  aria-label={`Открыть TOOLOR в ${store.name}`}
                  className="app-store-button"
                  href={store.href}
                  key={store.name}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  <StoreIcon kind={store.icon} />
                  <span>
                    <small>{store.eyebrow}</small>
                    <strong>{store.name}</strong>
                  </span>
                  <span aria-hidden="true" className="app-store-arrow">
                    ↗
                  </span>
                </a>
              ))}
            </div>

            <div className="app-qr-grid">
              {APP_STORES.map((store, index) => (
                <a
                  aria-label={`Сканировать QR-код для ${store.name}`}
                  className="app-qr-card"
                  href={store.href}
                  key={store.name}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  <span className="app-qr-index" aria-hidden="true">
                    0{index + 1}
                  </span>
                  <span className="app-qr-image">
                    <Image
                      alt={`QR-код TOOLOR для ${store.name}`}
                      height={store.qrSize}
                      src={store.qr}
                      unoptimized
                      width={store.qrSize}
                    />
                  </span>
                  <span className="app-qr-meta">
                    <strong>{store.name}</strong>
                    <small>Наведите камеру</small>
                  </span>
                </a>
              ))}
            </div>
          </div>

          <div className="app-phone-stage" aria-hidden="true">
            <div className="app-phone app-phone-back">
              <div className="app-phone-speaker" />
              <div className="app-phone-screen">
                <div className="app-phone-ui-bar">
                  <span>TOOLOR</span>
                  <i />
                </div>
                <div className="app-phone-photo">
                  <Image
                    alt=""
                    fill
                    sizes="(max-width: 767px) 42vw, 240px"
                    src="/imgs/3590000.webp"
                  />
                </div>
                <div className="app-phone-ui-copy">
                  <small>NEW EDIT</small>
                  <strong>Modern nomads</strong>
                </div>
              </div>
            </div>

            <div className="app-phone app-phone-front">
              <div className="app-phone-speaker" />
              <div className="app-phone-screen">
                <div className="app-phone-ui-bar app-phone-ui-bar-light">
                  <span>TOOLOR</span>
                  <i />
                </div>
                <div className="app-phone-photo">
                  <Image
                    alt=""
                    fill
                    sizes="(max-width: 767px) 45vw, 270px"
                    src="/imgs/3590142.webp"
                  />
                </div>
                <div className="app-phone-floating-label">
                  <small>COLLECTION / 02</small>
                  <strong>Тишина в движении</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
