"use client";

import dynamic from "next/dynamic";

export const DeferredTrafficTracker = dynamic(
  () => import("@/components/traffic-tracker").then((module) => module.TrafficTracker),
  {
    ssr: false,
    loading: () => null
  }
);
