import DiagnosticDashboard from "@/components/DiagnosticDashboard";
import Hero from "@/components/Hero";
import LogoCarousel from "@/components/LogoCarousel";
import SectionDivider from "@/components/SectionDivider";

// Navbar is mounted once in app/layout.tsx so it persists across routes.
export default function Home() {
  return (
    <main id="main-content" className="flex flex-1 scroll-mt-16 flex-col">
      <Hero />
      <DiagnosticDashboard />
      <LogoCarousel />
      <SectionDivider />
    </main>
  );
}
