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
  CheckCircle2
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
    <Card className="shadow-card border-primary/20 overflow-hidden">
      <CardHeader className="bg-primary/5 border-b border-border/50 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg text-secondary">
          <FileText className="w-5 h-5 text-primary" />
          Extracted Information
          <Badge variant="outline" className="ml-auto text-xs">
            {fileName}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {!hasData ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No structured data could be extracted. The AI will analyze the raw text.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {/* CAS Numbers */}
            {data.casNumbers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-secondary">
                  <FlaskConical className="w-4 h-4 text-primary" />
                  CAS Numbers
                </div>
                <div className="flex flex-wrap gap-1">
                  {data.casNumbers.map((cas, i) => (
                    <Badge key={i} variant="secondary" className="font-mono text-xs">
                      {cas}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Active Ingredients */}
            {data.activeIngredients.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-secondary">
                  <Pill className="w-4 h-4 text-success" />
                  Active Ingredients
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {data.activeIngredients.slice(0, 3).map((item, i) => (
                    <li key={i} className="truncate">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Safety Warnings */}
            {data.safetyWarnings.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-secondary">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Safety Warnings
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {data.safetyWarnings.slice(0, 3).map((item, i) => (
                    <li key={i} className="truncate">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Chemical Composition */}
            {data.chemicalComposition.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-secondary">
                  <Beaker className="w-4 h-4 text-primary" />
                  Composition
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {data.chemicalComposition.slice(0, 3).map((item, i) => (
                    <li key={i} className="truncate">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Packaging */}
            {data.packaging.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-secondary">
                  <Package className="w-4 h-4 text-primary" />
                  Packaging
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {data.packaging.slice(0, 2).map((item, i) => (
                    <li key={i} className="truncate">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Therapeutic Use */}
            {data.therapeuticUse.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-secondary">
                  <Stethoscope className="w-4 h-4 text-success" />
                  Therapeutic Use
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {data.therapeuticUse.slice(0, 2).map((item, i) => (
                    <li key={i} className="truncate">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Manufacturer */}
            {data.manufacturer && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-secondary">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  Manufacturer
                </div>
                <p className="text-xs text-muted-foreground truncate">{data.manufacturer}</p>
              </div>
            )}

            {/* Storage */}
            {data.storage && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-secondary">
                  <Thermometer className="w-4 h-4 text-muted-foreground" />
                  Storage
                </div>
                <p className="text-xs text-muted-foreground truncate">{data.storage}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 text-xs text-success border-t border-border/50">
          <CheckCircle2 className="w-3 h-3" />
          Data ready for AI classification
        </div>
      </CardContent>
    </Card>
  );
}
