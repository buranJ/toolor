/**
 * Cold "torn mountain silhouette" edge (reference 5 / H·I DRIVE).
 * Sits over the top or bottom of a dark frost section so the surrounding
 * surface colour cuts into the image as a jagged mountain range.
 */
export function MountainEdge({
  position,
  className = "text-paper",
}: {
  position: "top" | "bottom";
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={`mountain-edge mountain-edge-${position} ${className}`}
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      fill="currentColor"
    >
      <path d="M0,0 H1440 V64 L1372,22 L1300,70 L1224,18 L1150,66 L1066,28 L980,74 L892,20 L812,60 L724,26 L640,72 L556,24 L470,64 L384,30 L300,74 L214,22 L140,58 L64,28 L0,60 Z" />
    </svg>
  );
}
