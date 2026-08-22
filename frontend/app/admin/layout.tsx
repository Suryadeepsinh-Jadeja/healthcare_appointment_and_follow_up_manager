import { RequireRole } from "../../components/RequireRole";
import { PortalNav } from "../../components/PortalNav";

const LINKS = [
  { href: "/admin/doctors", label: "Doctors" },
  { href: "/admin/notifications", label: "Failed notifications" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="ADMIN">
      <PortalNav links={LINKS} />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </RequireRole>
  );
}
