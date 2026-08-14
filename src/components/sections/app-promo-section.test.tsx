import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppPromoSection } from "./app-promo-section";

const playStoreUrl =
  "https://play.google.com/store/apps/details?id=com.toolor.toolor_app&pcampaignid=web_share";
const appStoreUrl = "https://apps.apple.com/kg/app/toolor/id6761310984";

describe("AppPromoSection", () => {
  it("keeps every store button and QR card on the supplied app URL", () => {
    render(<AppPromoSection locale="ru" />);

    const playLinks = screen.getAllByRole("link", { name: /Google Play/ });
    const appLinks = screen.getAllByRole("link", { name: /App Store/ });

    expect(playLinks).toHaveLength(2);
    expect(appLinks).toHaveLength(2);
    expect(
      playLinks.every((link) => link.getAttribute("href") === playStoreUrl),
    ).toBe(true);
    expect(
      appLinks.every((link) => link.getAttribute("href") === appStoreUrl),
    ).toBe(true);
  });
});
