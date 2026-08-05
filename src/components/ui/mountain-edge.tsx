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
      <path d="M0,0 H1440 V58 L1388,41 L1349,63 L1300,29 L1268,52 L1232,71 L1190,44 L1151,18 L1118,55 L1082,68 L1041,46 L1002,80 L968,37 L931,58 L888,66 L849,48 L806,23 L771,54 L735,73 L697,84 L651,45 L612,60 L568,69 L523,31 L489,56 L451,64 L409,50 L361,78 L318,88 L272,52 L233,67 L191,39 L152,61 L108,72 L67,47 L34,66 L0,54 Z" />
    </svg>
  );
}
