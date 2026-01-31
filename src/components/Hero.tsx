import { ArrowDown, Shield, Sparkles, FileCheck, FlaskConical, Brain, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroProps {
  onStartClick: () => void;
}

export function Hero({ onStartClick }: HeroProps) {
  return (
    <section className="relative min-h-[65vh] gradient-hero overflow-hidden">
      {/* Animated Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/15 rounded-full blur-3xl animate-float" />
        <div className="absolute top-20 -left-20 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-10 right-1/4 w-64 h-64 bg-success/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl gradient-button flex items-center justify-center shadow-button">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-secondary">Easy Ship AI</span>
        </div>
      </header>

      {/* Hero Content */}
      <div className="relative z-10 px-6 py-16 md:py-20 max-w-4xl mx-auto text-center">
        <div 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20 mb-6 animate-fade-slide-up"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-secondary">
            AI-Powered Tariff Classification
          </span>
        </div>

        <h1 
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-secondary mb-6 animate-fade-slide-up" 
          style={{ animationDelay: "0.1s" }}
        >
          Easy Ship AI
        </h1>

        <p 
          className="text-xl md:text-2xl text-primary font-semibold mb-4 animate-fade-slide-up" 
          style={{ animationDelay: "0.2s" }}
        >
          The Explainable AI Co-Pilot for Irish Pharma Tariff Codes
        </p>

        <p 
          className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-slide-up" 
          style={{ animationDelay: "0.3s" }}
        >
          Get your HS/TARIC code + audit-ready legal defense memo in seconds.
          No more guessing or expensive consultants.
        </p>

        {/* ATLAS-Inspired Value Props */}
        <div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10 max-w-3xl mx-auto animate-fade-slide-up" 
          style={{ animationDelay: "0.4s" }}
        >
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl glass-card glass-card-hover">
            <FileCheck className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="text-sm font-medium text-foreground">Upload Spec Sheet</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl glass-card glass-card-hover">
            <FlaskConical className="w-5 h-5 text-warning flex-shrink-0" />
            <span className="text-sm font-medium text-foreground">MSDS & CAS Numbers</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl glass-card glass-card-hover">
            <Scale className="w-5 h-5 text-secondary flex-shrink-0" />
            <span className="text-sm font-medium text-foreground">GIR Reasoning</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl glass-card glass-card-hover">
            <Brain className="w-5 h-5 text-success flex-shrink-0" />
            <span className="text-sm font-medium text-foreground">ATLAS Metrics</span>
          </div>
        </div>

        <Button
          variant="hero"
          size="xl"
          onClick={onStartClick}
          className="animate-fade-slide-up hover-scale shadow-button"
          style={{ animationDelay: "0.5s" }}
        >
          Start Classifying
          <ArrowDown className="w-5 h-5 ml-1 group-hover:translate-y-1 transition-transform" />
        </Button>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
