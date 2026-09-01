import { useContext } from "react";
import { ExperienceContext } from "@/lib/experience-context-value";

export function useExperience() {
  const ctx = useContext(ExperienceContext);
  if (!ctx)
    throw new Error("useExperience must be used inside ExperienceProvider");
  return ctx;
}
