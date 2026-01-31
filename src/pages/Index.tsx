import { useState, useRef } from "react";
import { Hero } from "@/components/Hero";
import { ClassificationInput } from "@/components/ClassificationInput";
import { ProcessingOverlay } from "@/components/ProcessingOverlay";
import { ResultCard } from "@/components/ResultCard";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ExtractedPharmaData } from "@/lib/pdfParser";

interface ClassificationResult {
  hsCode: string;
  memo: string;
  confidence?: number;
  sixDigitAccuracy?: string;
}

export default function Index() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  const scrollToInput = () => {
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleClassify = async (input: { text: string; extractedData?: ExtractedPharmaData }) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('classify-product', {
        body: {
          productDescription: input.text,
          extractedData: input.extractedData,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult({
        hsCode: data.hsCode,
        memo: data.memo,
        confidence: data.confidence,
        sixDigitAccuracy: data.sixDigitAccuracy,
      });
      toast.success("Classification complete!");
    } catch (error) {
      console.error('Classification error:', error);
      const message = error instanceof Error ? error.message : "Classification failed. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    scrollToInput();
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
