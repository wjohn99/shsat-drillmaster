import { useEffect } from "react";
import { Link } from "react-router-dom";
import logoIcon from "@/assets/logo-icon.png";

export default function Privacy() {
  useEffect(() => {
    document.title = "Privacy policy, StepPrep Hub";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-brand-navy text-white">
        <div className="container flex items-center py-5">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
              <img src={logoIcon} alt="" className="h-8 w-8 object-contain" />
            </span>
            <span className="leading-none">
              <span className="block font-serif text-[15px] font-semibold tracking-tight">StepPrep</span>
              <span className="mt-0.5 block text-[10px] uppercase tracking-[0.16em] text-brand-cream">
                DrillMaster
              </span>
            </span>
          </Link>
        </div>
      </header>

      <main className="container max-w-3xl py-12">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          StepPrep Hub
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight">Privacy policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated November 9, 2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-foreground">
          <section className="space-y-3">
            <p>
              StepPrep Hub is the SHSAT Drillmaster site at stepprephub.com, operated by StepPrep.
              This policy describes the information we collect when you sign in with Google and use
              the site, how we use it, and how to ask us to delete it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Information from Google</h2>
            <p>
              When you choose Sign in with Google, we receive the name, email address, profile photo,
              and account ID that Google provides for that account. We use them to create your
              StepPrep Hub account, keep you signed in, and show your name to the tutor, student, or
              parent connected to you.
            </p>
            <p>
              We request only the basic profile information needed to identify the account. We do not
              use Google account data for advertising, and we do not sell it. We do not use it to
              train generalized artificial intelligence models.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Information you add in the product</h2>
            <p>Depending on how you use the site, we also store:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Your role, such as student, parent, tutor, or demo.</li>
              <li>A student email address a parent enters so the two accounts can be linked.</li>
              <li>Practice answers, scores, timing, notes, highlights, and bookmarks.</li>
              <li>Diagnostic results and worksheet assignments.</li>
              <li>Files you upload to a workspace or a homework submission, including PDF, image, and HTML files.</li>
              <li>Notes a tutor writes about class work.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">How we use it</h2>
            <p>We use this information to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Run practice, diagnostics, worksheets, and the class workspace.</li>
              <li>Show a tutor the work of students on their roster.</li>
              <li>Show a linked parent that student's results.</li>
              <li>Send account and class email, such as a notice about workspace activity.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Who can see it</h2>
            <p>
              A student's practice, diagnostic results, worksheet submissions, and workspace files are
              visible to that student, their tutor, and a parent account linked to the student. Tutor
              notes marked private stay with the tutor.
            </p>
            <p>
              Google Firebase stores accounts and app data. Mailgun sends notification email. Those
              providers process the information only so the site can function. We do not share personal
              information with advertisers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">How long we keep it</h2>
            <p>
              We keep the account and the class records attached to it while the account is in use.
              Email john@steppreptutoring.com to ask us to delete an account and the information stored
              with it. We delete that information unless we need to keep a copy to meet a legal duty.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Contact</h2>
            <p>
              Questions about this policy or your information can be sent to{" "}
              <a className="font-medium underline-offset-4 hover:underline" href="mailto:john@steppreptutoring.com">
                john@steppreptutoring.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
