import { Shield, ExternalLink, AlertTriangle } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-8 px-6 border-t border-border/50 mt-auto bg-card/50">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          {/* Branding */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-secondary">
              Easy Ship AI
            </span>
            <span className="text-xs text-muted-foreground">
              • Pharma Tariff Co-Pilot
            </span>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 max-w-md">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <strong className="text-warning">Disclaimer:</strong> Results from
              external LLM backend. Always verify with Revenue/Customs expert.
              Not official legal or tax advice.
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://www.revenue.ie/en/customs/index.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
            >
              Irish Revenue
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
