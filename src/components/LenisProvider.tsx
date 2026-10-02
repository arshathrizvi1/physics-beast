"use client";

import { useEffect } from "react";
// Disabled Lenis globally to fix severe lag and latency issues
// import Lenis from "lenis";

export default function LenisProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
