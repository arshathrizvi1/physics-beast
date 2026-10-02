import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\components\LenisProvider.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

repl = """"use client";

import { useEffect } from "react";
// Disabled Lenis globally to fix severe lag and latency issues
// import Lenis from "lenis";

export default function LenisProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
"""
with open(path, 'w', encoding='utf-8') as f:
    f.write(repl)
print("Disabled Lenis to fix scroll lag")
