import type { ComponentPropsWithoutRef } from "react";

interface SectionProps extends ComponentPropsWithoutRef<"section"> {
  timelineAnchor?: string;
}

export function Section({
  className = "",
  timelineAnchor,
  ...props
}: SectionProps) {
  return (
    <section
      className={`py-16 md:py-24 lg:py-32 ${className}`}
      data-scroll-anchor={timelineAnchor}
      {...props}
    />
  );
}
