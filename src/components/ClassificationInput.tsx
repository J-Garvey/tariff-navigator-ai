import { useState, forwardRef } from "react";
import { Sparkles, FileText, Loader2, Beaker, AlertTriangle, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/FileUploader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ClassificationInputProps {
  onClassify: (input: { specSheet?: File; msds?: File; text?: string }) => void;
  isLoading: boolean;
}

const SAMPLE_DESCRIPTION = `Pembrolizumab Injection 10ml Vial
- Active ingredient: Pembrolizumab 100mg (humanized monoclonal antibody)
- Formulation: Sterile solution for IV infusion
- Excipients: L-histidine, polysorbate 80, sucrose, water for injection
- Primary container: Type I borosilicate glass vial with chlorobutyl rubber stopper
- Therapeutic indication: Treatment of melanoma and non-small cell lung cancer
- Manufacturer: Pharmaceutical company based in Ireland
- Storage: 2-8°C refrigerated

MSDS Information:
- CAS Number: 1374853-91-4 (Pembrolizumab)
- Hazard Classification: Not classified as hazardous
- Safety Warnings: For IV use only. Handle with aseptic technique.`;

export const ClassificationInput = forwardRef<HTMLDivElement, ClassificationInputProps>(
  ({ onClassify, isLoading }, ref) => {
    const [specSheet, setSpecSheet] = useState<File | null>(null);
    const [msds, setMsds] = useState<File | null>(null);
    const [text, setText] = useState("");

    const handleClassify = () => {
      if (specSheet || msds || text.trim()) {
        onClassify({ 
          specSheet: specSheet || undefined, 
          msds: msds || undefined, 
          text: text || undefined 
        });
      }
    };

    const loadSample = () => {
      setSpecSheet(null);
      setMsds(null);
      setText(SAMPLE_DESCRIPTION);
    };

    const canClassify = (specSheet || msds || text.trim()) && !isLoading;

    return (
      <section ref={ref} className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-card hover:shadow-card-hover transition-shadow duration-300 border-border/50 overflow-hidden">
            <div className="gradient-card">
              <CardContent className="p-6 md:p-8 space-y-6">
                {/* Header */}
                <div className="text-center mb-2">
                  <h2 className="text-2xl font-semibold text-foreground mb-2">
                    Classify Your Product
                  </h2>
                  <p className="text-muted-foreground">
                    Upload specification documents or paste your product details
                  </p>
                </div>

                {/* Document Upload Tabs */}
                <Tabs defaultValue="spec" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="spec" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Spec Sheet
                    </TabsTrigger>
                    <TabsTrigger value="msds" className="flex items-center gap-2">
                      <FlaskConical className="w-4 h-4" />
                      MSDS
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="spec" className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Product Specification PDF
                    </label>
                    <FileUploader 
                      onFileSelect={setSpecSheet} 
                      selectedFile={specSheet}
                      description="Upload product spec sheet"
                    />
                  </TabsContent>
                  
                  <TabsContent value="msds" className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      Material Safety Data Sheet (MSDS)
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Include CAS numbers, hazard classifications, and safety warnings
                    </p>
                    <FileUploader 
                      onFileSelect={setMsds} 
                      selectedFile={msds}
                      description="Upload MSDS document"
                    />
                  </TabsContent>
                </Tabs>

                {/* Uploaded Files Summary */}
                {(specSheet || msds) && (
                  <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-accent/30 border border-border/50">
                    <span className="text-xs text-muted-foreground">Uploaded:</span>
                    {specSheet && (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        Spec Sheet ✓
                      </span>
                    )}
                    {msds && (
                      <span className="text-xs px-2 py-1 rounded-full bg-warning/10 text-warning">
                        MSDS ✓
                      </span>
                    )}
                  </div>
                )}

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 text-sm text-muted-foreground bg-card">
                      or paste description
                    </span>
                  </div>
                </div>

                {/* Text Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">
                      Product Details & Safety Info
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadSample}
                      className="text-xs text-primary hover:text-primary/80 h-auto py-1"
                      disabled={isLoading}
                    >
                      <Beaker className="w-3 h-3 mr-1" />
                      Load Sample
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Paste product specifications, CAS numbers, safety warnings, formulation details..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="min-h-[140px] resize-none bg-background/50 border-border focus:border-primary/50 transition-colors"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Include: Active ingredients, CAS numbers, formulation, packaging materials, therapeutic use
                  </p>
                </div>

                {/* Classify Button */}
                <Button
                  variant="hero"
                  size="xl"
                  className="w-full"
                  onClick={handleClassify}
                  disabled={!canClassify}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Classify Now
                    </>
                  )}
                </Button>
              </CardContent>
            </div>
          </Card>
        </div>
      </section>
    );
  }
);

ClassificationInput.displayName = "ClassificationInput";
