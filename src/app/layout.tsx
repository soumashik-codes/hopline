import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { RouteFocus } from "@/components/RouteFocus";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

// Self-hosted at build time by next/font: no request to Google from the browser.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hopline – London journey planner",
  description: "Accessible journey planner with step-free routing, starting with London.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={bricolage.variable}>
      <body>
        <div className="app">
          <ToastProvider>
            <main className="screen" id="main">
              {children}
            </main>
            <BottomNav />
          </ToastProvider>
        </div>
        <RouteFocus />
      </body>
    </html>
  );
}
