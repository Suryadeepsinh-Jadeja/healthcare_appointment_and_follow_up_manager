import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../lib/auth";
import { ToastProvider } from "../components/Toast";

export const metadata: Metadata = {
  title: "Healthcare Appointment & Follow-up Manager",
  description: "Book appointments, get AI visit summaries, and stay on top of follow-ups.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-canvas font-sans text-slate-900 antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
