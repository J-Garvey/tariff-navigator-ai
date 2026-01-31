import { useState, forwardRef } from "react";
import { Sparkles, FileText, Loader2, Beaker } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/FileUploader";
import { Card, CardContent } from "@/components/ui/card";

interface ClassificationInputProps {
  onClassify: (input: { file?: File; text?: string }) => void;
  isLoading: boolean;
}

const SAMPLE_DESCRIPTION = `Pembrolizumab Injection 10ml Vial
- Active ingredient: Pembrolizumab 100mg (humanized monoclonal antibody)
- Formulation: Sterile solution for IV infusion
- Excipients: L-histidine, polysorbate 80, sucrose, water for injection
- Primary container: Type I borosilicate glass vial with chlorobutyl rubber stopper
- Therapeutic indication: Treatment of melanoma and non-small cell lung cancer
- Manufacturer: Pharmaceutical company based in Ireland
- Storage: 2-8°C refrigerated`;

export const ClassificationInput = forwardRef<HTMLDivElement, ClassificationInputProps>(
  ({ onClassify, isLoading }, ref) => {
    const [file, setFile] = useState<File | null>(null);
    const [text, setText] = useState("");

    const handleClassify = () => {
      if (file || text.trim()) {
        onClassify({ file: file || undefined, text: text || undefined });
      }
    };

    const loadSample = () => {
      setFile(null);
      setText(SAMPLE_DESCRIPTION);
    };

    const canClassify = (file || text.trim()) && !isLoading;

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
                    Upload a specification PDF or paste your product description
                  </p>
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Product Specification PDF
                  </label>
                  <FileUploader onFileSelect={setFile} selectedFile={file} />
                </div>

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
                      Product Description
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadSample}
                      className="text-xs text-primary hover:text-primary/80 h-auto py-1"
                      disabled={isLoading}
                    >
                      <Beaker className="w-3 h-3 mr-1" />
                      Load Sample: Pembrolizumab
                    </Button>
                  </div>
                  <Textarea
                    placeholder="e.g., '10ml Vial of Pembrolizumab with saline buffer and glass packaging, used for cancer immunotherapy...'"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="min-h-[140px] resize-none bg-background/50 border-border focus:border-primary/50 transition-colors"
                    disabled={isLoading}
                  />
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
