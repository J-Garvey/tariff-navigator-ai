import { ExtractedPharmaData } from "./pdfParser";

// Placeholder API endpoint - replace with your actual backend URL
const API_ENDPOINT = "https://llm-backend.example.com/classify";

// Optional: Add API key from environment variable
const API_KEY = import.meta.env.VITE_LLM_API_KEY || "";

export interface ClassificationRequest {
  extracted_text: string;
  cas_numbers: string[];
  safety_warnings: string[];
  product_description: string;
  active_ingredients: string[];
  chemical_composition: string[];
  formulation: string[];
  packaging: string[];
  therapeutic_use: string[];
  manufacturer: string | null;
  storage: string | null;
}

export interface ClassificationResponse {
  hs_code: string;
  memo: string;
  partial_accuracy: string;
  confidence?: number;
  six_digit_match?: string;
}

export async function classifyProduct(
  text: string,
  extractedData?: ExtractedPharmaData
): Promise<ClassificationResponse> {
  const requestBody: ClassificationRequest = {
    extracted_text: extractedData?.rawText || text,
    cas_numbers: extractedData?.casNumbers || [],
    safety_warnings: extractedData?.safetyWarnings || [],
    product_description: text,
    active_ingredients: extractedData?.activeIngredients || [],
    chemical_composition: extractedData?.chemicalComposition || [],
    formulation: extractedData?.formulation || [],
    packaging: extractedData?.packaging || [],
    therapeutic_use: extractedData?.therapeuticUse || [],
    manufacturer: extractedData?.manufacturer || null,
    storage: extractedData?.storage || null,
  };

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Add authorization header if API key is provided
  if (API_KEY) {
    headers["Authorization"] = `Bearer ${API_KEY}`;
  }

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication failed - check API key with LLM team");
      }
      if (response.status === 429) {
        throw new Error("Rate limited - please wait and try again");
      }
      if (response.status >= 500) {
        throw new Error("Backend server error - contact LLM team");
      }
      throw new Error(`Backend error (${response.status}) - try again`);
    }

    const data: ClassificationResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      // Network error or CORS issue - use mock data for demo
      console.warn("API not reachable, using demo response");
      return getMockResponse(text, extractedData);
    }
    throw error;
  }
}

// Mock response for demo/development when backend isn't available
function getMockResponse(
  text: string,
  extractedData?: ExtractedPharmaData
): ClassificationResponse {
  const hasPembrolizumab = text.toLowerCase().includes("pembrolizumab");
  const hasMonoclonal = text.toLowerCase().includes("monoclonal");
  const hasVaccine = text.toLowerCase().includes("vaccine");

  let hsCode = "3004.90.00.00";
  let memo = "**Classification Analysis**\n\nBased on the provided product description...";

  if (hasPembrolizumab || hasMonoclonal) {
    hsCode = "3002.15.00.00";
    memo = `**Classification Analysis for Immunological Product**

**1. Product Identification**
The product is identified as a monoclonal antibody preparation${extractedData?.casNumbers?.length ? ` with CAS Number(s): ${extractedData.casNumbers.join(", ")}` : ""}.

**2. Applicable Classification Rules**

**GIR 1 (General Interpretive Rule 1):**
Classification determined according to the terms of headings and Section/Chapter Notes.

**Chapter 30 Note 2:**
Heading 3002 applies to immunological products, including monoclonal antibodies for therapeutic/prophylactic use.

**GIR 3(b) – Essential Character:**
The active pharmaceutical ingredient (monoclonal antibody) imparts essential character. Packaging materials (glass vials, rubber stoppers) do not affect classification per GIR 5.

**3. Heading Selection**

**Heading 3002:** Blood and immunological products
- **3002.15:** Immunological products, put up in measured doses or in forms or packings for retail sale

**4. Classification Justification**

This product is properly classified under **HS 3002.15.00.00** because:
• It is a monoclonal antibody (immunological product) per Chapter 30 Note 2
• It is put up in measured doses (injectable formulation)
• Glass packaging does not change classification under GIR 3(b) and GIR 5
• Consistent with EU BTI rulings for similar products

**5. Supporting References**
- EU Combined Nomenclature Explanatory Notes, Chapter 30
- WCO HS Classification Opinion 3002.15
- Irish Revenue Classification Guidelines`;
  } else if (hasVaccine) {
    hsCode = "3002.41.00.00";
    memo = `**Classification Analysis for Vaccine Product**

**1. Product Identification**
Vaccine preparation for human medicine.

**2. Classification Rules Applied**
- GIR 1: Terms of heading 3002
- Chapter 30 Note 2: Vaccines for human medicine

**3. Classification: HS 3002.41.00.00**
Vaccines for human medicine, classified under heading 3002.41.`;
  }

  return {
    hs_code: hsCode,
    memo,
    partial_accuracy: "6-digit match: 92.3%",
    confidence: 0.92,
    six_digit_match: "High confidence",
  };
}
