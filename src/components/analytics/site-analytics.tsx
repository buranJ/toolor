"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

import { analyticsBootstrap, trackPageView } from "@/lib/analytics/tracking";

export function SiteAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) trackPageView();
  }, [ready, pathname, searchParams]);

  return (
    <Script
      id="toolor-site-analytics"
      strategy="afterInteractive"
      onReady={() => setReady(true)}
    >
      {analyticsBootstrap}
    </Script>
  );
}
