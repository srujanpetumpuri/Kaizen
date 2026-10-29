import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const THEME_SCRIPT = `try{var t=localStorage.getItem("kaizen-theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}`;

export const metadata: Metadata = {
  title: "Kaizen",
  description: "Focus timer and workout planner in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        {/* Sets the theme before first paint (saved choice, else the system setting) so there's no flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-svh">{children}</body>
    </html>
  );
}