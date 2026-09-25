"use client";

import Link from "next/link";
import { PolarisProvider } from "@/components/polaris";

/** Polaris components navigate through next/link (client-side routing). */
export function PolarisLinkProvider({ children }: { children: React.ReactNode }) {
  return <PolarisProvider linkComponent={Link}>{children}</PolarisProvider>;
}
