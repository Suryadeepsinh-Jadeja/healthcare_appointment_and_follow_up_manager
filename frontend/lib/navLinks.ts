import { BellRing, CalendarCheck, CalendarClock, LayoutDashboard, Settings, Stethoscope, Users } from "lucide-react";
import type { NavLink } from "../components/AppShell";
import { Role } from "./types";

export const NAV_LINKS: Record<Role, NavLink[]> = {
  PATIENT: [
    { href: "/patient", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/patient/doctors", label: "Find a doctor", icon: Stethoscope },
    { href: "/patient/appointments", label: "My appointments", icon: CalendarCheck },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
  DOCTOR: [
    { href: "/doctor", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/doctor/appointments", label: "Appointments", icon: CalendarClock },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
  ADMIN: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/admin/doctors", label: "Doctors", icon: Users },
    { href: "/admin/notifications", label: "Failed notifications", icon: BellRing },
  ],
};
