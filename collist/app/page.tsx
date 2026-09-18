import DiagnosticDashboard from "@/components/DiagnosticDashboard";
import FundedDirectory from "@/components/FundedDirectory";
import Hero from "@/components/Hero";
import LogoCarousel from "@/components/LogoCarousel";
import MatchMatrix from "@/components/MatchMatrix";
import RoadmapTimeline from "@/components/RoadmapTimeline";
import SectionDivider from "@/components/SectionDivider";

// Navbar is mounted once in app/layout.tsx so it persists across routes.
export default function Home() {
  return (
    <main id="main-content" className="flex flex-1 scroll-mt-16 flex-col">
      <Hero />
      <DiagnosticDashboard />
      <MatchMatrix />
      <RoadmapTimeline />
      <FundedDirectory />
      <LogoCarousel />
      <SectionDivider />
    </main>
  );
}
