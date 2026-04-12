"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const Navbar = dynamic(
  () => import("@/components/navbar").then((m) => ({ default: m.Navbar })),
  { ssr: false }
);

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense>
        <Navbar />
      </Suspense>
      {children}
    </>
  );
}
