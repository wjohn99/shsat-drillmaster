import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedStat } from "@/components/home/AnimatedStat";
import { ScrollReveal } from "@/components/home/ScrollReveal";
import { Header } from "@/components/layout/Header";
import {
  BookOpen,
  Brain,
  Target,
  Clock,
  CheckCircle,
  ArrowRight,
  Search,
  Sparkles,
  BarChart3,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { AuthLink } from "@/components/auth/AuthLink";
import { questions } from "@/data/mockData";
import { allTags, isFormatTagCode } from "@/data/taggingScheme";
import { useHeroParallax } from "@/hooks/useScrollReveal";
import heroImage from "@/assets/hero-education.jpg";
import logoIcon from "@/assets/logo-icon.png";

const FEATURES: {
  icon: LucideIcon;
  title: string;
  description: string;
  iconClass: string;
}[] = [
  {
    icon: Search,
    title: "Advanced Filtering",
    description:
      "Find exactly what you need with powerful filters by subject, difficulty, question type, and skill tags.",
    iconClass: "bg-gradient-math",
  },
  {
    icon: Brain,
    title: "Instant Feedback",
    description:
      "Get immediate explanations and detailed solutions for every question to understand concepts thoroughly.",
    iconClass: "bg-gradient-ela",
  },
  {
    icon: BarChart3,
    title: "Progress Analytics",
    description:
      "Track performance with detailed analytics showing strengths, weaknesses, and improvement over time.",
    iconClass: "bg-gradient-primary",
  },
  {
    icon: Target,
    title: "Targeted Practice",
    description:
      "Focus on specific skills with curated practice forms designed to target your weakest areas.",
    iconClass: "bg-gradient-math",
  },
  {
    icon: Clock,
    title: "Timed Practice",
    description:
      "Practice under realistic test conditions with built-in timers and pacing guidance for optimal performance.",
    iconClass: "bg-gradient-ela",
  },
  {
    icon: BookOpen,
    title: "Reading Passages",
    description:
      "Master ELA with authentic reading passages and comprehension questions across various text types.",
    iconClass: "bg-gradient-primary",
  },
];

const Index = () => {
  const heroRef = useHeroParallax<HTMLElement>();
  const stats = {
    totalQuestions: questions.length,
    skillsTested: allTags.filter((tag) => !isFormatTagCode(tag.code)).length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="hero-scroll-section relative overflow-hidden bg-brand-navy"
      >
        <div className="absolute inset-0 bg-brand-navy/92" />
        <div
          className="hero-scroll-bg hero-bg-image absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div
          aria-hidden
          className="hero-scroll-glow hero-ambient-glow -left-24 top-1/4 h-64 w-64 md:-left-16 md:h-80 md:w-80"
        />
        <div
          aria-hidden
          className="hero-scroll-glow hero-ambient-glow right-0 top-1/2 h-48 w-48 md:h-72 md:w-72"
          style={{ animationDelay: "-4s" }}
        />
        <div className="relative container flex min-h-[48vh] flex-col items-center justify-center px-4 py-14 text-center md:min-h-[52vh] md:py-16">
          <div className="hero-scroll-content hero-enter mx-auto flex max-w-4xl flex-col items-center">
            <p className="mb-6 text-base font-semibold uppercase tracking-[0.25em] text-brand-cream/90 md:text-lg">
              Built by tutors. For tutors.
            </p>
            <h1 className="mb-8 text-4xl font-bold leading-[1.15] text-white md:text-5xl lg:text-6xl">
              Master the SHSAT with
              <span className="mt-2 block text-brand-cream">StepPrep Hub</span>
            </h1>
            <p className="mb-10 max-w-3xl text-lg leading-relaxed text-white/85 md:text-xl md:leading-8">
              A methodology-driven practice platform built for the new adaptive SHSAT, designed to help you diagnose, drill, and track mastery with your students, not just hand them more questions.
            </p>
            <p className="mb-10">
              <span className="pointer-events-none inline-flex cursor-default items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2.5 text-sm font-medium text-white shadow-sm backdrop-blur-sm md:px-5 md:py-3 md:text-base">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-300 md:h-5 md:w-5" />
                Full platform access included with StepPrep Hub
              </span>
            </p>
            <Button
              asChild
              variant="brand"
              size="lg"
              className="h-14 rounded-full px-10 text-lg font-semibold shadow-xl hover:shadow-2xl [&_svg]:size-6"
            >
              <AuthLink to="/dashboard">
                <Sparkles className="mr-2.5" />
                Join the Free Beta
              </AuthLink>
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
              <div className="mb-2 text-4xl font-bold text-brand-cream md:text-5xl">Free</div>
              <div className="text-sm text-white/75 md:text-base">Beta Access</div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-background py-24 md:py-32">
        <div className="container px-4">
          <div className="mb-20 text-center md:mb-24">
            <ScrollReveal variant="clip">
              <h2 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">
                Everything You Need to Succeed
              </h2>
            </ScrollReveal>
            <ScrollReveal variant="blur" delayIndex={1}>
              <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl md:leading-8">
                From targeted drills to progress analytics, DrillMaster gives tutors and
                students the same structured tools used across StepPrep tutoring.
              </p>
            </ScrollReveal>
            <div className="scroll-view-line mx-auto mt-8 h-px w-32 origin-left bg-primary/25" />
          </div>

          <div className="features-grid grid gap-8 md:grid-cols-2 md:gap-10 lg:grid-cols-3">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              const variant = index % 2 === 0 ? "left" : "right";
              return (
                <ScrollReveal
                  key={feature.title}
                  variant={variant}
                  delayIndex={(index % 3) + 1}
                  className="h-full"
                >
                  <Card className="feature-card motion-lift group h-full border-primary/10 transition-all duration-300 hover:border-primary/25 hover:shadow-lg">
                    <CardHeader className="space-y-4 pb-2">
                      <div
                        className={`feature-icon flex h-12 w-12 items-center justify-center rounded-lg ${feature.iconClass}`}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-xl transition-colors duration-200 group-hover:text-primary">
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="leading-relaxed text-muted-foreground">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <div aria-hidden className="section-curve-to-navy" />

      {/* CTA Section */}
      <section className="cta-section relative overflow-hidden bg-brand-navy py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-primary opacity-95" />
        <ScrollReveal
          variant="scale"
          className="relative container px-4 text-center text-white"
        >
          <div className="cta-rings" aria-hidden>
            <span className="cta-ring" />
            <span className="cta-ring" />
            <span className="cta-ring" />
          </div>
          <div className="cta-content">
            <h2 className="mb-8 text-3xl font-bold md:mb-10 md:text-4xl lg:text-5xl">
              Ready to Start Your SHSAT Journey?
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-white/85 md:mb-14 md:text-xl md:leading-8">
              Join StepPrep tutors and students using DrillMaster to build confidence,
              close skill gaps, and prepare for test day.
            </p>
            <div className="flex justify-center">
              <Button
                asChild
                variant="brand"
                size="lg"
                className="h-14 rounded-full px-10 text-lg font-semibold shadow-xl hover:shadow-2xl"
              >
                <AuthLink to="/dashboard">
                  Get Started
                  <ArrowRight className="ml-2.5 h-5 w-5" />
                </AuthLink>
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/10 bg-brand-navy">
        <div className="container h-full px-4 py-8 md:py-10">
          <ScrollReveal variant="up" threshold={0.05}>
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center">
                  <img src={logoIcon} alt="StepPrep Logo" className="h-12 w-12 object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-white">StepPrep</span>
                  <span className="text-xs text-white/65">DrillMaster</span>
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
