import {Inter} from "next/font/google";
import "./globals.css";
import {cn} from "@/lib/utils";
import {AuthProvider} from "@/lib/auth-context";
import {Toaster} from "@/components/ui/sonner";

const inter = Inter({subsets: ["latin"]});

export const metadata = {
  title: "Firext System",
  description: "Fire extinguisher monitoring system",
};

export default function RootLayout({children}) {
  return (
    <html lang="en" className="h-full">
      <body className={cn(inter.className, "h-full bg-background")}>
        <AuthProvider>{children}</AuthProvider>
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
