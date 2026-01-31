import { 
  FlaskConical, 
  AlertTriangle, 
  Pill, 
  Package, 
  Beaker, 
  Stethoscope,
  Building,
  Thermometer,
  FileText,
  CheckCircle2,
  Send
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExtractedPharmaData } from "@/lib/pdfParser";

interface ExtractionPreviewProps {
  data: ExtractedPharmaData;
  fileName: string;
}

export function ExtractionPreview({ data, fileName }: ExtractionPreviewProps) {
  const hasData = data.casNumbers.length > 0 || 
                  data.activeIngredients.length > 0 || 
                  data.safetyWarnings.length > 0 ||
                  data.chemicalComposition.length > 0;

  return (
    <Card className="glass-card border-primary/20 overflow-hidden rounded-2xl animate-fade-slide-up">
      <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg text-secondary">
          <FileText className="w-5 h-5 text-primary" />
          Extracted Information
          <Badge variant="outline" className="ml-auto text-xs border-primary/30">
            {fileName}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        {!hasData ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            No structured data could be extracted. The raw text will be sent to the LLM backend.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {/* CAS Numbers */}
            {data.casNumbers.length > 0 && (
              <div className="space-y-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                  <FlaskConical className="w-4 h-4 text-primary" />
                  CAS Numbers
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.casNumbers.map((cas, i) => (
                    <Badge key={i} variant="secondary" className="font-mono text-xs bg-primary/10 text-primary">
                      {cas}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Active Ingredients */}
            {data.activeIngredients.length > 0 && (
              <div className="space-y-2 p-3 rounded-xl bg-success/5 border border-success/10">
                <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                  <Pill className="w-4 h-4 text-success" />
                  Active Ingredients
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {data.activeIngredients.slice(0, 3).map((item, i) => (
                    <li key={i} className="truncate">• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Safety Warnings */}
            {data.safetyWarnings.length > 0 && (
              <div className="space-y-2 p-3 rounded-xl bg-warning/5 border border-warning/10">
                <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Safety Warnings
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {data.safetyWarnings.slice(0, 3).map((item, i) => (
                    <li key={i} className="truncate">• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Chemical Composition */}
            {data.chemicalComposition.length > 0 && (
              <div className="space-y-2 p-3 rounded-xl bg-secondary/5 border border-secondary/10">
                <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                  <Beaker className="w-4 h-4 text-secondary" />
                  Composition
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {data.chemicalComposition.slice(0, 3).map((item, i) => (
                    <li key={i} className="truncate">• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Packaging */}
            {data.packaging.length > 0 && (
              <div className="space-y-2 p-3 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  Packaging
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {data.packaging.slice(0, 2).map((item, i) => (
                    <li key={i} className="truncate">• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Therapeutic Use */}
            {data.therapeuticUse.length > 0 && (
              <div className="space-y-2 p-3 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                  <Stethoscope className="w-4 h-4 text-success" />
                  Therapeutic Use
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {data.therapeuticUse.slice(0, 2).map((item, i) => (
                    <li key={i} className="truncate">• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Manufacturer */}
            {data.manufacturer && (
              <div className="space-y-2 p-3 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  Manufacturer
                </div>
                <p className="text-xs text-muted-foreground truncate">{data.manufacturer}</p>
              </div>
            )}

            {/* Storage */}
            {data.storage && (
              <div className="space-y-2 p-3 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                  <Thermometer className="w-4 h-4 text-muted-foreground" />
                  Storage
                </div>
                <p className="text-xs text-muted-foreground truncate">{data.storage}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-3 text-xs text-success border-t border-border/50">
          <Send className="w-3.5 h-3.5" />
          <span className="font-medium">Ready to send to LLM backend for classification</span>
          <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />
        </div>
      </CardContent>
    </Card>
  );
}
