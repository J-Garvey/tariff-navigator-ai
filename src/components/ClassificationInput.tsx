import { useState, forwardRef } from "react";
import { Sparkles, FileText, Loader2, Beaker, AlertTriangle, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/FileUploader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExtractionPreview } from "@/components/ExtractionPreview";
import { parseAndExtractPDF, extractPharmaData, ExtractedPharmaData } from "@/lib/pdfParser";
import { toast } from "sonner";

interface ClassificationInputProps {
  onClassify: (input: { text: string; extractedData?: ExtractedPharmaData }) => void;
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
    const [extractedData, setExtractedData] = useState<ExtractedPharmaData | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);

    const handleFileSelect = async (file: File | null, type: 'spec' | 'msds') => {
      if (type === 'spec') {
        setSpecSheet(file);
      } else {
        setMsds(file);
      }

      if (file) {
        setIsExtracting(true);
        try {
          const data = await parseAndExtractPDF(file);
          setExtractedData(prev => {
            if (prev) {
              return {
                ...prev,
                rawText: prev.rawText + '\n\n' + data.rawText,
                casNumbers: [...new Set([...prev.casNumbers, ...data.casNumbers])],
                activeIngredients: [...new Set([...prev.activeIngredients, ...data.activeIngredients])],
                safetyWarnings: [...new Set([...prev.safetyWarnings, ...data.safetyWarnings])],
                chemicalComposition: [...new Set([...prev.chemicalComposition, ...data.chemicalComposition])],
                formulation: [...new Set([...prev.formulation, ...data.formulation])],
                packaging: [...new Set([...prev.packaging, ...data.packaging])],
                therapeuticUse: [...new Set([...prev.therapeuticUse, ...data.therapeuticUse])],
                manufacturer: prev.manufacturer || data.manufacturer,
                storage: prev.storage || data.storage,
              };
            }
            return data;
          });
          toast.success(`Extracted data from ${file.name}`);
        } catch (error) {
          console.error('PDF extraction error:', error);
          toast.error('Could not extract text from PDF. Try pasting the content manually.');
        } finally {
          setIsExtracting(false);
        }
      }
    };

    const handleClassify = () => {
      let combinedText = text;
      if (extractedData?.rawText) {
        combinedText = extractedData.rawText + '\n\n' + text;
      }

      if (combinedText.trim()) {
        onClassify({ 
          text: combinedText,
          extractedData: extractedData || undefined
        });
      } else {
        toast.error('Upload a PDF or enter product details');
      }
    };

    const loadSample = () => {
      setSpecSheet(null);
      setMsds(null);
      setText(SAMPLE_DESCRIPTION);
      setExtractedData(extractPharmaData(SAMPLE_DESCRIPTION));
      toast.success('Sample data loaded');
    };

    const handleReset = () => {
      setSpecSheet(null);
      setMsds(null);
      setText("");
      setExtractedData(null);
    };

    const canClassify = (specSheet || msds || text.trim()) && !isLoading && !isExtracting;

    return (
      <section ref={ref} className="py-16 px-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="glass-card glass-card-hover border-primary/20 overflow-hidden rounded-2xl">
            <div className="gradient-card">
              <CardContent className="p-6 md:p-8 space-y-6">
                {/* Header */}
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold text-secondary mb-2">
                    Classify Your Product
                  </h2>
                  <p className="text-muted-foreground">
                    Upload specification documents or paste your product details
                  </p>
                </div>

                {/* Document Upload Tabs */}
                <Tabs defaultValue="spec" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4 h-12 rounded-xl">
                    <TabsTrigger value="spec" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <FileText className="w-4 h-4" />
                      Spec Sheet
                    </TabsTrigger>
                    <TabsTrigger value="msds" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-warning data-[state=active]:text-warning-foreground">
                      <FlaskConical className="w-4 h-4" />
                      MSDS
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="spec" className="space-y-3">
                    <label className="text-sm font-semibold text-secondary flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Product Specification PDF
                    </label>
                    <FileUploader 
                      onFileSelect={(file) => handleFileSelect(file, 'spec')} 
                      selectedFile={specSheet}
                      description="Drop spec sheet PDF or click to upload"
                    />
                  </TabsContent>
                  
                  <TabsContent value="msds" className="space-y-3">
                    <label className="text-sm font-semibold text-secondary flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      Material Safety Data Sheet (MSDS)
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Include CAS numbers, hazard classifications, and safety warnings
                    </p>
                    <FileUploader 
                      onFileSelect={(file) => handleFileSelect(file, 'msds')} 
                      selectedFile={msds}
                      description="Drop MSDS PDF or click to upload"
                    />
                  </TabsContent>
                </Tabs>

                {/* Extraction Loading */}
                {isExtracting && (
                  <div className="flex items-center justify-center gap-3 py-6 text-primary">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">Extracting document data...</span>
                  </div>
                )}

                {/* Uploaded Files Summary */}
                {(specSheet || msds) && !isExtracting && (
                  <div className="flex flex-wrap gap-2 p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <span className="text-xs font-medium text-muted-foreground">Uploaded:</span>
                    {specSheet && (
                      <span className="text-xs px-3 py-1.5 rounded-full bg-primary/15 text-primary font-semibold">
                        ✓ Spec Sheet
                      </span>
                    )}
                    {msds && (
                      <span className="text-xs px-3 py-1.5 rounded-full bg-warning/15 text-warning font-semibold">
                        ✓ MSDS
                      </span>
                    )}
                  </div>
                )}

                {/* Divider */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 text-sm font-medium text-muted-foreground bg-card">
                      or paste description
                    </span>
                  </div>
                </div>

                {/* Text Input */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-secondary">
                      Product Details & Safety Info
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadSample}
                      className="text-xs text-primary hover:text-primary/80 hover:bg-primary/10 h-auto py-1.5 px-3 rounded-lg"
                      disabled={isLoading}
                    >
                      <Beaker className="w-3.5 h-3.5 mr-1.5" />
                      Load Sample
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Paste product specifications, CAS numbers, safety warnings, formulation details..."
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      if (e.target.value.trim()) {
                        setExtractedData(extractPharmaData(e.target.value));
                      }
                    }}
                    className="min-h-[150px] resize-none bg-background/50 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Include: Active ingredients, CAS numbers, formulation, packaging, therapeutic use
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  {(specSheet || msds || text) && (
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      disabled={isLoading}
                      className="flex-shrink-0 rounded-xl h-12 hover-glow"
                    >
                      Clear All
                    </Button>
                  )}
                  <Button
                    variant="hero"
                    size="xl"
                    className="flex-1 rounded-xl hover-scale-sm shadow-button"
                    onClick={handleClassify}
                    disabled={!canClassify}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending to Backend...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Classify Now
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>

          {/* Extraction Preview */}
          {extractedData && !isExtracting && (
            <ExtractionPreview 
              data={extractedData} 
              fileName={specSheet?.name || msds?.name || "Manual Input"} 
            />
          )}
        </div>
      </section>
    );
  }
);

ClassificationInput.displayName = "ClassificationInput";
