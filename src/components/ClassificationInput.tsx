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
              // Merge with existing data
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
      // Combine all text sources
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
        toast.error('Please upload a document or enter product details');
      }
    };

    const loadSample = () => {
      setSpecSheet(null);
      setMsds(null);
      setText(SAMPLE_DESCRIPTION);
      setExtractedData(extractPharmaData(SAMPLE_DESCRIPTION));
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
          <Card className="shadow-card hover:shadow-card-hover transition-shadow duration-300 border-primary/20 overflow-hidden">
            <div className="gradient-card">
              <CardContent className="p-6 md:p-8 space-y-6">
                {/* Header */}
                <div className="text-center mb-2">
                  <h2 className="text-2xl font-semibold text-secondary mb-2">
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
                    <label className="text-sm font-medium text-secondary flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Product Specification PDF
                    </label>
                    <FileUploader 
                      onFileSelect={(file) => handleFileSelect(file, 'spec')} 
                      selectedFile={specSheet}
                      description="Upload product spec sheet"
                    />
                  </TabsContent>
                  
                  <TabsContent value="msds" className="space-y-2">
                    <label className="text-sm font-medium text-secondary flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      Material Safety Data Sheet (MSDS)
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Include CAS numbers, hazard classifications, and safety warnings
                    </p>
                    <FileUploader 
                      onFileSelect={(file) => handleFileSelect(file, 'msds')} 
                      selectedFile={msds}
                      description="Upload MSDS document"
                    />
                  </TabsContent>
                </Tabs>

                {/* Extraction Loading */}
                {isExtracting && (
                  <div className="flex items-center justify-center gap-2 py-4 text-primary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Extracting document data...</span>
                  </div>
                )}

                {/* Uploaded Files Summary */}
                {(specSheet || msds) && !isExtracting && (
                  <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <span className="text-xs text-muted-foreground">Uploaded:</span>
                    {specSheet && (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                        Spec Sheet ✓
                      </span>
                    )}
                    {msds && (
                      <span className="text-xs px-2 py-1 rounded-full bg-warning/10 text-warning font-medium">
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
                    <label className="text-sm font-medium text-secondary">
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
                    onChange={(e) => {
                      setText(e.target.value);
                      if (e.target.value.trim()) {
                        setExtractedData(extractPharmaData(e.target.value));
                      }
                    }}
                    className="min-h-[140px] resize-none bg-background/50 border-border focus:border-primary/50 transition-colors"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Include: Active ingredients, CAS numbers, formulation, packaging materials, therapeutic use
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {(specSheet || msds || text) && (
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      disabled={isLoading}
                      className="flex-shrink-0"
                    >
                      Clear All
                    </Button>
                  )}
                  <Button
                    variant="hero"
                    size="xl"
                    className="flex-1"
                    onClick={handleClassify}
                    disabled={!canClassify}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Classifying...
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
