import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedStat } from "@/components/home/AnimatedStat";
import { ScrollReveal } from "@/components/home/ScrollReveal";
import { Header } from "@/components/layout/Header";
import {
  ArrowRight,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { AuthLink } from "@/components/auth/AuthLink";
import { QuestionsStatus } from "@/components/questions/QuestionsStatus";
import { useQuestions } from "@/contexts/QuestionsContext";
import { useAuth } from "@/contexts/AuthContext";
import { allTags, isFormatTagCode } from "@/data/taggingScheme";
import { useHeroParallax } from "@/hooks/useScrollReveal";
import heroImage from "@/assets/hero-education.jpg";
import logoIcon from "@/assets/logo-icon.png";

const FEATURES: { title: string; description: string }[] = [
  {
    title: "Advanced filtering",
    description:
      "Find exactly what you need with filters by subject, module, question type, and skill tags.",
  },
  {
    title: "Instant feedback",
    description:
      "Get explanations and solutions for every question so students can see where they went wrong.",
  },
  {
    title: "Progress analytics",
    description:
      "Track performance with a clear view of strengths, weaknesses, and improvement over time.",
  },
  {
    title: "Targeted practice",
    description:
      "Focus on specific skills with curated practice forms designed around weaker areas.",
  },
  {
    title: "Timed practice",
    description:
      "Practice under realistic test conditions with timers and pacing guidance.",
  },
  {
    title: "Reading passages",
    description:
      "Master ELA with authentic passages and comprehension questions across text types.",
  },
];

const Index = () => {
  const heroRef = useHeroParallax<HTMLElement>();
  const { questions } = useQuestions();
  const { profile, loading: authLoading } = useAuth();
  const stats = {
    totalQuestions: questions.length,
    skillsTested: allTags.filter((tag) => !isFormatTagCode(tag.code)).length,
  };

  if (authLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (profile) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="hero-scroll-section relative -mt-[4.75rem] overflow-hidden bg-brand-navy pt-[4.75rem]"
      >
        <div className="absolute inset-0 bg-brand-navy/92" />
        <div
          className="hero-scroll-bg hero-bg-image absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="relative container flex min-h-[48vh] flex-col items-center justify-center px-4 py-16 text-center md:min-h-[52vh] md:py-20">
          <div className="hero-scroll-content mx-auto flex max-w-3xl flex-col items-center">
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.22em] text-brand-cream/90">
              Built by tutors. For tutors.
            </p>
            <h1 className="mb-6 font-serif text-4xl font-semibold leading-[1.15] tracking-tight text-white md:text-5xl">
              Master the SHSAT with
              <span className="mt-2 block text-brand-cream">StepPrep Hub</span>
            </h1>
            <p className="mb-8 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
              Diagnose, drill, and track mastery with your students — a practice platform for the
              adaptive SHSAT, not just another pile of questions.
            </p>
            <p className="mb-8">
              <span className="glass-dark inline-flex items-center rounded-full border px-4 py-2 text-sm text-white/90">
                Full platform access included with StepPrep Hub
              </span>
            </p>
            <Button asChild variant="brand" size="lg">
              <AuthLink to="/dashboard">Join the free beta</AuthLink>
            </Button>
          </div>
          <div
            aria-hidden
            className="scroll-hint absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-white/50"
          >
            <span className="text-[10px] font-medium uppercase tracking-[0.2em]">Scroll</span>
            <ChevronDown className="h-5 w-5" />
          </div>
        </div>
      </section>

      <div aria-hidden className="section-wave" />

      {/* Stats Section */}
      <QuestionsStatus quiet>
      <section className="bg-brand-navy pt-8 pb-12 md:pt-10 md:pb-16">
        <div className="container px-4">
          <ScrollReveal variant="clip" className="mb-10 text-center md:mb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-cream/80">
              By the numbers
            </p>
            <div className="scroll-view-line mx-auto mt-4 h-px w-24 origin-left bg-brand-cream/40" />
          </ScrollReveal>
          <div className="grid grid-cols-2 gap-y-10 gap-x-8 md:grid-cols-4 md:gap-y-0">
            <AnimatedStat
              value={stats.totalQuestions}
              suffix="+"
              label="Practice Questions"
              delayIndex={0}
            />
            <AnimatedStat
              value={stats.skillsTested}
              label="Skills Tested"
              delayIndex={1}
            />
            <AnimatedStat value={20} suffix="+" label="Years Tutoring" delayIndex={2} />
            <ScrollReveal delayIndex={3} variant="scale" className="text-center">
              <div className="mb-2 font-serif text-4xl font-semibold text-brand-cream md:text-5xl">Free</div>
              <div className="text-sm text-white/75 md:text-base">Beta Access</div>
            </ScrollReveal>
          </div>
        </div>
      </section>
      </QuestionsStatus>

      {/* Features Section */}
      <section className="py-20 md:py-24">
        <div className="container px-4">
          <div className="mb-12 max-w-2xl md:mb-16">
            <h2 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
              Tools used in tutoring
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              From targeted drills to progress analytics, DrillMaster gives tutors and students
              the same structured tools used across StepPrep.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <Card key={feature.title} className="h-full">
                <CardHeader className="space-y-2 pb-2">
                  <p className="text-[11px] font-medium tabular-nums tracking-[0.14em] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <div aria-hidden className="section-curve-to-navy" />

      {/* CTA Section */}
      <section className="bg-brand-navy py-16 md:py-20">
        <div className="container px-4 text-white">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
              Ready for test day?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-white/75">
              Join StepPrep tutors and students using DrillMaster to close skill gaps and
              prepare with a plan.
            </p>
            <Button asChild variant="brand" size="lg" className="mt-8">
              <AuthLink to="/dashboard">
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </AuthLink>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/10 bg-brand-navy">
        <div className="container h-full px-4 py-8 md:py-10">
          <ScrollReveal variant="up" threshold={0.05}>
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div className="flex items-center gap-2.5">
                <img src={logoIcon} alt="StepPrep Logo" className="h-8 w-8 object-contain" />
                <div className="flex flex-col leading-none">
                  <span className="font-serif text-[15px] font-semibold text-white">StepPrep</span>
                  <span className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-white/55">
                    DrillMaster
                  </span>
                </div>
              </div>
              <p className="text-sm text-white/65">
                © {new Date().getFullYear()} StepPrep. All rights reserved.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </footer>
    </div>
  );
};

export default Index;
