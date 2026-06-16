import { useEffect } from "react";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingStatusStrip } from "@/components/landing/LandingStatusStrip";
import { LandingProductGrid } from "@/components/landing/LandingProductGrid";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingQuietCta } from "@/components/landing/LandingQuietCta";
import { LandingFooter } from "@/components/landing/LandingFooter";

type Props = { navigate: (to: string) => void };

export function LandingPage({ navigate }: Props) {
  /* ─── Scroll reveal ─── */
  useEffect(() => {
    const reveals = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) return;

    reveals.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top > window.innerHeight) {
        el.classList.add("out");
      }
    });

    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.remove("out");
        }),
      { threshold: 0.15 },
    );
    reveals.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <LandingHero navigate={navigate} />
      <LandingStatusStrip />
      <LandingProductGrid navigate={navigate} />
      <LandingHowItWorks />
      <LandingQuietCta />
      <LandingFooter navigate={navigate} />
    </>
  );
}
