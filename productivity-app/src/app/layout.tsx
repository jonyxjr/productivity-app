import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Fokus – Ruhe für deinen Kopf", description: "Dein ruhiger Workspace für Aufgaben, Fortschritt und einen klaren Kopf." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="de"><body>{children}</body></html>; }
