import type { CSSProperties } from "react";

const TONES = {
  blue: "var(--brand-blue)",
  white: "#ffffff",
  ink: "var(--ink)",
} as const;

/**
 * TOOLOR wordmark (public/logo.png). The source file is a single-colour
 * silhouette, so it is recoloured exactly via CSS mask — brand blue on light
 * surfaces, white on dark. Size it by setting a height in `className`.
 */
export function BrandLogo({
  tone = "blue",
  className = "h-5",
  title = "TOOLOR",
}: {
  tone?: keyof typeof TONES;
  className?: string;
  title?: string;
}) {
  const style: CSSProperties = {
    display: "block",
    aspectRatio: "1726 / 483",
    backgroundColor: TONES[tone],
    WebkitMaskImage: "url(/logo.png)",
    maskImage: "url(/logo.png)",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  };

  return (
    <span
      role="img"
      aria-label={title}
      className={className}
      style={style}
    />
  );
}
