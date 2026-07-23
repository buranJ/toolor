import Image from "next/image";

const SRC = {
  white: "/run.png",
  black: "/run-k.png",
  grey: "/run-gr.png",
} as const;

const ANIMATION = {
  float: "brand-mark-float",
  drift: "brand-mark-drift",
  none: "",
} as const;

/**
 * Decorative TOOLOR brand mark (run.png family). Purely ornamental — hidden
 * from assistive tech. Animation respects prefers-reduced-motion via CSS.
 */
export function BrandMark({
  variant = "white",
  animate = "float",
  className = "",
  priority = false,
}: {
  variant?: keyof typeof SRC;
  animate?: keyof typeof ANIMATION;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none block ${ANIMATION[animate]} ${className}`}
    >
      <Image
        alt=""
        src={SRC[variant]}
        width={776}
        height={425}
        priority={priority}
        className="h-auto w-full object-contain"
      />
    </span>
  );
}
