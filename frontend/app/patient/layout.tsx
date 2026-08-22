import { RequireRole } from "../../components/RequireRole";
import { PortalNav } from "../../components/PortalNav";

const LINKS = [
  { href: "/patient/doctors", label: "Find a doctor" },
  { href: "/patient/appointments", label: "My appointments" },
  { href: "/settings", label: "Settings" },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="PATIENT">
      <PortalNav links={LINKS} />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </RequireRole>
  );
}
