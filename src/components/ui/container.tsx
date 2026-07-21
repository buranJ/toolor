import type { ComponentPropsWithoutRef } from "react";

type ContainerProps = ComponentPropsWithoutRef<"div">;

export function Container({ className = "", ...props }: ContainerProps) {
  return (
    <div
      className={`mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10 ${className}`}
      {...props}
    />
  );
}
