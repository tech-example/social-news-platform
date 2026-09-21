import "./globals.css";
import { MotionProvider } from "@/components/motion/motion-provider";
import { AppShell } from "@/components/layout/AppShell";

export const metadata = {
  title: "SocialNews - Social News and Content Platform",
  description: "A social format web application for content management and following news.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--ink)]">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--accent)] focus:text-white focus:rounded-md focus:shadow-md"
        >
          Skip to main content
        </a>
        <MotionProvider>
          <AppShell>{children}</AppShell>
        </MotionProvider>
      </body>
    </html>
  );
}
