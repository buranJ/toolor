import Image from "next/image";

import { BrandMark } from "@/components/ui/brand-mark";
import { Container } from "@/components/ui/container";
import { APP_STORES, StoreIcon } from "@/components/ui/app-store-links";
import { format, getDictionary, type Locale } from "@/i18n";

/**
 * Decorative photos inside the phone mock-ups. They are pulled from the current
 * imported catalogue rather than a local file so the promo never advertises a
 * garment the shop no longer sells — the previous pair pointed at product
 * images that were deleted with the old workbook.
 */
const PHONE_PHOTO_BACK = "https://i.postimg.cc/sXcTcBYq/color34741.jpg";
const PHONE_PHOTO_FRONT = "https://i.postimg.cc/8CdZ54HT/color35655.jpg";

export function AppPromoSection({ locale }: { locale: Locale }) {
  const d = getDictionary(locale);
  const copy = d.home.appPromo;

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
              {copy.titleLead}{" "}
              <span className="serif-italic">{copy.titleAccent}</span>
            </h2>
            <p className="app-promo-description">{copy.description}</p>

            <div className="app-store-buttons" aria-label={copy.linksAria}>
              {APP_STORES.map((store) => (
                <a
                  aria-label={format(copy.openIn, { store: store.name })}
                  className="app-store-button"
                  href={store.href}
                  key={store.name}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  <StoreIcon kind={store.icon} />
                  <span>
                    <small>{d.appStores[store.eyebrowKey]}</small>
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
                  aria-label={format(copy.scanQr, { store: store.name })}
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
                      alt={format(copy.qrAlt, { store: store.name })}
                      height={store.qrSize}
                      src={store.qr}
                      unoptimized
                      width={store.qrSize}
                    />
                  </span>
                  <span className="app-qr-meta">
                    <strong>{store.name}</strong>
                    <small>{copy.pointCamera}</small>
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
                    src={PHONE_PHOTO_BACK}
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
                    src={PHONE_PHOTO_FRONT}
                  />
                </div>
                <div className="app-phone-floating-label">
                  <small>COLLECTION / 02</small>
                  <strong>{copy.phoneCaption}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
