import { ArrowDown, Shield, Sparkles, FileCheck, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroProps {
  onStartClick: () => void;
}

export function Hero({ onStartClick }: HeroProps) {
  return (
    <section className="relative min-h-[60vh] gradient-hero overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-20 -left-20 w-72 h-72 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-48 h-48 bg-success/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shadow-button">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground">Bio-Classify AI</span>
        </div>
      </header>

      {/* Hero Content */}
      <div className="relative z-10 px-6 py-16 md:py-24 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20 mb-6 animate-fade-in">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-secondary">
            AI-Powered Tariff Classification
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-secondary mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          Bio-Classify AI
        </h1>

        <p className="text-xl md:text-2xl text-primary font-medium mb-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          The Explainable AI Co-Pilot for Irish Pharma Tariff Codes
        </p>

        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          Get your HS/TARIC code + audit-ready legal defense memo in seconds.
          No more guessing or expensive consultants.
        </p>

        {/* Value Props */}
        <div className="flex flex-wrap justify-center gap-4 mb-10 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/80 backdrop-blur-sm border border-primary/20 shadow-card">
            <FileCheck className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground">Upload Spec Sheet</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/80 backdrop-blur-sm border border-primary/20 shadow-card">
            <FlaskConical className="w-4 h-4 text-warning" />
            <span className="text-sm text-foreground">MSDS & CAS Numbers</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/80 backdrop-blur-sm border border-primary/20 shadow-card">
            <Sparkles className="w-4 h-4 text-secondary" />
            <span className="text-sm text-foreground">AI Applies GIRs & Chapter 30</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/80 backdrop-blur-sm border border-primary/20 shadow-card">
            <Shield className="w-4 h-4 text-success" />
            <span className="text-sm text-foreground">Audit-Ready Justification</span>
          </div>
        </div>

        <Button
          variant="hero"
          size="xl"
          onClick={onStartClick}
          className="animate-fade-in-up group"
          style={{ animationDelay: "0.5s" }}
        >
          Start Classifying
          <ArrowDown className="w-5 h-5 ml-1 group-hover:translate-y-1 transition-transform" />
        </Button>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
