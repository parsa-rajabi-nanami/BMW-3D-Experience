import { lazy, Suspense, useCallback } from "react";
import {
  ConfiguratorSection,
  SummarySection,
} from "@/components/experience/Configurator";
import { Nav } from "@/components/experience/Nav";
import {
  Closing,
  Engineering,
  Explore,
  Hero,
  Modes,
  Performance,
} from "@/components/experience/Sections";
import { useSectionObserver } from "@/hooks/use-section-observer";
import { useExperience } from "@/hooks/use-experience";
import { ExperienceProvider } from "@/lib/experience-context";
import type { SectionId } from "@/lib/experience";

const ThreeExperience = lazy(
  () => import("@/components/three/ThreeExperience"),
);

function SceneChunkLoading() {
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center"
    >
      <p className="panel px-4 py-3 text-[9px] font-semibold tracking-[0.25em] text-muted-foreground uppercase">
        Preparing vehicle preview…
      </p>
    </div>
  );
}

function ExperiencePage() {
  const { setSection } = useExperience();
  const onChange = useCallback((id: SectionId) => setSection(id), [setSection]);
  useSectionObserver(onChange);

  return (
    <>
      <Suspense fallback={<SceneChunkLoading />}>
        <ThreeExperience />
      </Suspense>
      <Nav />
      <a
        href="#experience-content"
        className="sr-only fixed left-4 top-4 z-[110] bg-foreground px-4 py-3 text-xs font-semibold text-background focus:not-sr-only"
      >
        Skip to experience
      </a>
      <main
        id="experience-content"
        tabIndex={-1}
        className="relative min-w-0 overflow-x-clip"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-5 bg-[radial-gradient(120%_90%_at_50%_0%,transparent_35%,rgba(3,4,6,0.82)_100%)]"
        />
        <Hero />
        <Performance />
        <Explore />
        <ConfiguratorSection />
        <Engineering />
        <Modes />
        <SummarySection />
        <Closing />
      </main>
    </>
  );
}

export default function App() {
  return (
    <ExperienceProvider>
      <ExperiencePage />
    </ExperienceProvider>
  );
}
