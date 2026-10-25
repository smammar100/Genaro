"use client";

import Link from "next/link";
import { GenaroProvider } from "@/components/genaro";

/** Genaro components navigate through next/link (client-side routing). */
export function GenaroLinkProvider({ children }: { children: React.ReactNode }) {
  return <GenaroProvider linkComponent={Link}>{children}</GenaroProvider>;
}
