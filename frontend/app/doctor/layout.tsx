import { RequireRole } from "../../components/RequireRole";
import { PortalNav } from "../../components/PortalNav";

const LINKS = [{ href: "/doctor/appointments", label: "Appointments" }];

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="DOCTOR">
      <PortalNav links={LINKS} />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </RequireRole>
  );
}
