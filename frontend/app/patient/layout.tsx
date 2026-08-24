"use client";

import { RequireRole } from "../../components/RequireRole";
import { AppShell } from "../../components/AppShell";
import { NAV_LINKS } from "../../lib/navLinks";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="PATIENT">
      <AppShell links={NAV_LINKS.PATIENT}>{children}</AppShell>
    </RequireRole>
  );
}
