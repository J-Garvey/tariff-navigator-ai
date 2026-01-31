import { useState, useRef } from "react";
import { Hero } from "@/components/Hero";
import { ClassificationInput } from "@/components/ClassificationInput";
import { ProcessingOverlay } from "@/components/ProcessingOverlay";
import { ResultCard } from "@/components/ResultCard";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";

interface ClassificationResult {
  hsCode: string;
  memo: string;
}

// Simulated classification for demo purposes
const MOCK_RESULT: ClassificationResult = {
  hsCode: "3002.15.00.00",
  memo: `**Classification Analysis for Pembrolizumab Injection**

**1. Product Identification**
The product is a 10ml vial containing Pembrolizumab (100mg), a humanized monoclonal antibody used in cancer immunotherapy. The formulation includes L-histidine, polysorbate 80, sucrose, and water for injection.

**2. Applicable Classification Rules**

**GIR 1 (General Interpretive Rule 1):**
Classification shall be determined according to the terms of the headings and any relative Section or Chapter Notes.

**Chapter 30 Note 2:**
Heading 3002 applies to immunological products whether used for diagnosis or treatment, including monoclonal antibodies.

**GIR 3(b) – Essential Character:**
While the product contains glass (vial) and rubber (stopper) components, the essential character is determined by the active pharmaceutical ingredient. The glass vial and rubber stopper are merely packaging and do not impart essential character.

**3. Heading Selection**

**Heading 3002:** Blood and immunological products
- **3002.15:** Immunological products, put up in measured doses or in forms or packings for retail sale

**4. Classification Justification**

The Pembrolizumab injection is properly classified under **HS 3002.15.00.00** because:

• It is a monoclonal antibody (immunological product) per Chapter 30 Note 2
• It is put up in measured doses (10ml vial, 100mg active ingredient)
• The glass packaging does not change the product's tariff classification under GIR 3(b)
• Similar products (e.g., Keytruda®) are classified under this heading per EU BTI rulings

**5. Supporting References**
- EU Combined Nomenclature Explanatory Notes, Chapter 30
- WCO HS Classification Opinion 3002.15
- Irish Revenue Classification Database

This classification is consistent with EU customs practice and provides an audit-ready defense for Revenue inquiries.`,
};

export default function Index() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  const scrollToInput = () => {
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleClassify = async (input: { specSheet?: File; msds?: File; text?: string }) => {
    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 4000));
      
      // For demo: show mock result
      // In production, this would call the AI backend
      setResult(MOCK_RESULT);
      toast.success("Classification complete!");
    } catch (error) {
      toast.error("Classification failed. Please try again.");
      console.error(error);
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
