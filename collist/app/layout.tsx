import type { Metadata } from "next";
import { Cinzel, Manrope } from "next/font/google";

import Navbar from "@/components/Navbar";
import { LanguageProvider } from "@/context/LanguageContext";
import { SkyThemeProvider } from "@/context/SkyThemeContext";
import { UserProvider } from "@/context/UserContext";
import "./globals.css";

// Cinzel carries the wordmark and academic headings (Latin only by design).
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

// Manrope covers UI text in both languages — it ships a Cyrillic subset.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ColList — Full-Funding University Navigator",
  description:
    "Find universities that fund you completely. ColList matches 10th–12th graders and gap-year reappliers to need-blind, full-tuition and full-ride institutions worldwide.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-sky="night"
      // The inline script below rewrites data-sky before hydration, which is a
      // deliberate server/client difference rather than a mismatch to fix.
      suppressHydrationWarning
      className={`${cinzel.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="bg-slate-deep min-h-full font-sans text-slate-200">
        {/* Applies the stored theme before the first paint. Without it a day-mode
            visitor sees a dark flash on every load, because the server has no
            way to know which theme they chose. */}
        <script
          dangerouslySetInnerHTML={{
            __html: '(function(){try{var v=localStorage.getItem("collist.sky");if(v==="day"||v==="night")document.documentElement.dataset.sky=v;}catch(e){}})();',
          }}
        />
        <LanguageProvider>
          <SkyThemeProvider>
            <UserProvider>
              <div id="top" className="flex min-h-full flex-col pt-16">
                <Navbar />
                {children}
              </div>
            </UserProvider>
          </SkyThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
