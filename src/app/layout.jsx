import "./globals.css";
import { MotionProvider } from "@/components/motion/motion-provider";
import { AppShell } from "@/components/layout/AppShell";

export const metadata = {
  title: "Social Content and News Platform",
  description: "A social format news platform.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <MotionProvider>
          <AppShell>{children}</AppShell>
        </MotionProvider>
      </body>
    </html>
  );
}
