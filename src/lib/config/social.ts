/**
 * Brand social links — the single source of truth for the footer icons and the
 * Instagram call-to-action on the homepage. Only TikTok is still a placeholder
 * and must be replaced with the real profile before launch.
 */
export const socialLinks = {
  instagram: "https://www.instagram.com/toolor_official/",
  // TODO: still a placeholder — the real TikTok profile URL is not known yet.
  tiktok: "https://www.tiktok.com/",
  whatsapp: "https://wa.me/996998844444",
  // The company slug contains a Cyrillic "к" (percent-encoded), so it is kept
  // escaped here to stay unambiguous in source and in generated markup.
  linkedin: "https://www.linkedin.com/company/toolo%D0%BA/",
} as const;

/** Handle shown next to the Instagram call-to-action. */
export const instagramHandle = "@toolor_official";
