export type Role = "PATIENT" | "DOCTOR" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string | null;
}

export interface Doctor {
  id: string;
  name: string;
  specialisation: string;
  slotDurationMin: number;
  workingHours?: Record<string, string[]>;
}

export interface Slot {
  start: string;
  end: string;
}

export type AppointmentStatus = "HELD" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

export interface PreVisitSummary {
  urgency: "Low" | "Medium" | "High" | "UNKNOWN";
  chiefComplaint: string;
  questions: string[];
  generationFailed?: boolean;
}

export interface PostVisitSummary {
  summary: string;
  medicationSchedule: Array<{ drug: string; dose: string; timing: string }>;
  followUpSteps: string[];
  generationFailed?: boolean;
}

export interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  slotStart: string;
  slotEnd: string;
  status: AppointmentStatus;
  holdExpiresAt: string | null;
  symptomForm: { symptoms: string } | null;
  preVisitSummary: PreVisitSummary | null;
  postVisitNotes: string | null;
  postVisitSummary: PostVisitSummary | null;
  prescription: Array<{ drug: string; dose: string; timesPerDay: number; days: number }> | null;
  doctor?: { specialisation: string; user: { name: string } };
  patient?: { user: { name: string; email: string } };
}

export interface NotificationLogEntry {
  id: string;
  appointmentId: string | null;
  type: string;
  channel: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
}
