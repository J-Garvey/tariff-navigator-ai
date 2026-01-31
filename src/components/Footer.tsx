import { Shield, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-8 px-6 border-t border-border/50 mt-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          {/* Branding */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Bio-Classify AI</span>
            <span className="text-xs">• Pharma Tariff Co-Pilot</span>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground max-w-md">
            <strong>Disclaimer:</strong> AI assistance only. Always verify with Revenue/Customs expert. 
            Not official legal or tax advice.
          </p>

          {/* Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://www.revenue.ie/en/customs/index.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
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
