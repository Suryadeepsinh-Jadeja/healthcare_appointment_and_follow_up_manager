"use client";

import { RequireRole } from "../../components/RequireRole";
import { AppShell } from "../../components/AppShell";
import { NAV_LINKS } from "../../lib/navLinks";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="DOCTOR">
      <AppShell links={NAV_LINKS.DOCTOR}>{children}</AppShell>
    </RequireRole>
  );
}
