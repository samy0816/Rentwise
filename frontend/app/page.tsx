"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  Check,
  FileSearch,
  Lightbulb,
  MessageSquareText,
  PiggyBank,
  Scale,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";

const steps = [
  {
    icon: UploadCloud,
    title: "Upload your documents",
    text: "Drop your rental contract, house rules, utility statements or landlord letters.",
  },
  {
    icon: FileSearch,
    title: "RentWise analyzes them",
    text: "We read the document and find what actually matters for you.",
  },
  {
    icon: Lightbulb,
    title: "See what matters",
    text: "Money, dates, responsibilities and clauses worth reviewing — at a glance.",
  },
  {
    icon: MessageSquareText,
    title: "Ask questions whenever you need",
    text: "Every answer is grounded in your own documents, with the source shown.",
  },
];

const features = [
  {
    icon: FileSearch,
    title: "Contract overview",
    text: "A clear summary of rent, deposit, dates and rules.",
  },
  {
    icon: CalendarClock,
    title: "Important dates",
    text: "Deadlines and notice periods surfaced before they matter.",
  },
  {
    icon: PiggyBank,
    title: "Money breakdown",
    text: "Rent, utilities, deposit and one-time costs in one view.",
  },
  {
    icon: Lightbulb,
    title: "Clause explanations",
    text: "Complex passages explained in plain, simple language.",
  },
  {
    icon: MessageSquareText,
    title: "AI Q&A",
    text: "Ask anything and get answers that point to the source.",
  },
  {
    icon: Scale,
    title: "Source references",
    text: "Every answer shows the document, page and section it came from.",
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();

  const primaryCta = user ? "/dashboard" : "/signup";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <Link href="/#how" className="transition hover:text-foreground">
              How it works
            </Link>
            <Link href="/#features" className="transition hover:text-foreground">
              Features
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Button size="sm" onClick={() => router.push("/dashboard")}>
                Open dashboard
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(15,118,110,0.14),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(3,105,161,0.10),transparent_55%)]" />
        </div>
        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div className="animate-fade-up">
            <Badge variant="secondary" className="mb-5">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              For renters in Germany
            </Badge>
            <h1 className="font-editorial text-balance text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
              Understand your rental contract.{" "}
              <span className="bg-gradient-to-r from-primary via-teal-500 to-[#0369A1] bg-clip-text text-transparent">
                Without the legal headache.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              RentWise turns complicated rental documents into clear information,
              important dates, potential obligations, and answers grounded in your
              own documents.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href={primaryCta}>
                  Upload your contract
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#how">See how it works</a>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Informational assistance only — not a substitute for legal advice.
            </p>
          </div>

          {/* Product mockup */}
          <div className="animate-fade-in">
            <div className="glass rounded-2xl p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">My Apartment</p>
                  <p className="text-xs text-muted-foreground">Berlin, Germany</p>
                </div>
                <Badge>Ready</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Monthly rent" value="€850" />
                <Stat label="Deposit" value="€1,700" />
                <Stat label="Contract" value="Unlimited" />
                <Stat label="Start date" value="01 Oct 2026" />
              </div>
              <div className="mt-4 rounded-xl bg-muted/50 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Worth knowing
                </p>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    Rent adjustment clause
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                    Minor repair obligation
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    3-month notice period
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4">
            How it works
          </Badge>
          <h2 className="font-editorial text-3xl font-semibold tracking-tight md:text-4xl">
            From a wall of text to what matters
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {steps.map((step, i) => (
            <Card key={step.title} className="card-hover border bg-card">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <step.icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  Step {i + 1}
                </p>
                <h3 className="mt-1 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">
              Features
            </Badge>
            <h2 className="font-editorial text-3xl font-semibold tracking-tight md:text-4xl">
              Everything you need to know, in one place
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="card-hover rounded-xl border bg-card p-6">
                <f.icon className="mb-4 h-6 w-6 text-primary" strokeWidth={1.8} />
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <div className="glass rounded-2xl p-8 shadow-xl">
          <Check className="mx-auto mb-4 h-8 w-8 text-primary" strokeWidth={1.8} />
          <h2 className="font-editorial text-2xl font-semibold tracking-tight">
            Informational assistance, not legal advice
          </h2>
          <p className="mt-4 text-muted-foreground">
            RentWise helps you understand your documents. It is a tool for
            information and decision support — it is not a substitute for
            professional legal advice and does not make legal conclusions.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="font-editorial text-3xl font-semibold tracking-tight">
            Ready to understand your contract?
          </h2>
          <Button asChild size="lg" className="mt-6">
            <Link href={primaryCta}>
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <Logo />
          <p>RentWise provides informational assistance and is not a substitute for professional legal advice.</p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
