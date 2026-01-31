import { useState, useRef } from "react";
import { Hero } from "@/components/Hero";
import { ClassificationInput } from "@/components/ClassificationInput";
import { ProcessingOverlay } from "@/components/ProcessingOverlay";
import { ResultCard } from "@/components/ResultCard";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { classifyProduct, ClassificationResponse } from "@/lib/api";
import { ExtractedPharmaData } from "@/lib/pdfParser";

interface ClassificationResult {
  hsCode: string;
  memo: string;
  confidence?: number;
  partialAccuracy?: string;
  sixDigitMatch?: string;
  validationWarning?: string;
  isDemoMode?: boolean;
}

export default function Index() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  const scrollToInput = () => {
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleClassify = async (input: {
    text: string;
    extractedData?: ExtractedPharmaData;
  }) => {
    if (!input.text.trim() && !input.extractedData?.rawText) {
      toast.error("Please provide product details to classify");
      return;
    }

    setIsLoading(true);

    try {
      const response: ClassificationResponse = await classifyProduct(
        input.text,
        input.extractedData,
      );

      setResult({
        hsCode: response.hs_code,
        memo: response.memo,
        confidence: response.confidence,
        partialAccuracy: response.partial_accuracy,
        sixDigitMatch: response.six_digit_match,
        validationWarning: response.validation_warning,
        isDemoMode: response.is_demo_mode,
      });

      if (response.is_demo_mode) {
        toast.warning(
          "Demo mode: Backend unavailable, showing simulated result",
        );
      } else if (response.validation_warning) {
        toast.warning(`Warning: ${response.validation_warning}`);
      } else {
        toast.success("Classification complete!");
      }
    } catch (error) {
      console.error("Classification error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Backend connection failed – check with LLM team";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setTimeout(() => scrollToInput(), 100);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Hero onStartClick={scrollToInput} />

      <main className="flex-1">
        {!result && (
          <ClassificationInput
            ref={inputRef}
            onClassify={handleClassify}
            isLoading={isLoading}
          />
        )}

        {result && <ResultCard result={result} onReset={handleReset} />}
      </main>

      <Footer />

      {isLoading && <ProcessingOverlay />}
    </div>
  );
}
