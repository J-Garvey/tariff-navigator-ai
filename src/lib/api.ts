import { ExtractedPharmaData } from "./pdfParser";

// Backend options:
// 1. Supabase Edge Function V2 (with database): VITE_SUPABASE_URL/functions/v1/classify-product-v2
// 2. Supabase Edge Function V1 (legacy): VITE_SUPABASE_URL/functions/v1/classify-product
// 3. Python FastAPI (toby/): http://localhost:8000/classify
// Set VITE_USE_PYTHON_BACKEND=true to use Python backend
// Set VITE_USE_LEGACY_API=true to use V1 (no database)

const USE_PYTHON_BACKEND = import.meta.env.VITE_USE_PYTHON_BACKEND === "true";
const USE_LEGACY_API = import.meta.env.VITE_USE_LEGACY_API === "true";
const PYTHON_API_ENDPOINT = import.meta.env.VITE_PYTHON_API_URL || "http://localhost:8000";

// Use V2 (database-backed) by default, fall back to V1 if VITE_USE_LEGACY_API is set
const SUPABASE_FUNCTION_NAME = USE_LEGACY_API ? "classify-product" : "classify-product-v2";
const SUPABASE_API_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${SUPABASE_FUNCTION_NAME}`;

const API_ENDPOINT = USE_PYTHON_BACKEND 
  ? `${PYTHON_API_ENDPOINT}/classify` 
  : SUPABASE_API_ENDPOINT;

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
  validation_warning?: string;
  is_demo_mode?: boolean;
  sources?: Array<{code: string; description: string; url: string}>;
  session_id?: string;
  database_validated?: boolean;
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
    // Only add Supabase auth header when using Supabase backend
    ...(USE_PYTHON_BACKEND ? {} : {
      "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    }),
  };

  try {
    console.log(`Using ${USE_PYTHON_BACKEND ? "Python" : "Supabase"} backend: ${API_ENDPOINT}`);
    
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
      // Network error or CORS issue - try Python backend as fallback, then demo
      if (!USE_PYTHON_BACKEND) {
        console.warn("Supabase API not reachable, trying Python backend...");
        try {
          const pythonResponse = await fetch(`${PYTHON_API_ENDPOINT}/classify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          });
          if (pythonResponse.ok) {
            const data = await pythonResponse.json();
            return { ...data, memo: data.memo || data.legal_memo };
          }
        } catch {
          console.warn("Python backend also not reachable");
        }
      }
      console.warn("All backends unreachable, using demo response. This is NOT a real classification.");
      return getMockResponse(text, extractedData);
    }
    throw error;
  }
}

// Mock response for demo/development when backend isn't available
// CLEARLY MARKED AS DEMO DATA - NOT REAL CLASSIFICATIONS
function getMockResponse(
  text: string,
  extractedData?: ExtractedPharmaData
): ClassificationResponse {
  const lowerText = text.toLowerCase();
  const hasPembrolizumab = lowerText.includes("pembrolizumab");
  const hasMonoclonal = lowerText.includes("monoclonal");
  const hasAntibody = lowerText.includes("antibody");
  const hasVaccine = lowerText.includes("vaccine");
  const hasInsulin = lowerText.includes("insulin");
  const hasAntibiotic = lowerText.includes("antibiotic") || lowerText.includes("penicillin") || lowerText.includes("amoxicillin");

  let hsCode = "3004.90.00.00";
  let confidence = 0.6;
  let memo = "";
  let productType = "General pharmaceutical";

  if (hasPembrolizumab || (hasMonoclonal && hasAntibody)) {
    hsCode = "3002.15.00.00";
    confidence = 0.85;
    productType = "Monoclonal antibody (immunological product)";
    memo = `**⚠️ DEMO MODE - This is a simulated classification**

**Classification Analysis for Immunological Product**

**Product Type:** ${productType}

**Active Ingredient:** ${hasPembrolizumab ? "Pembrolizumab" : "Monoclonal antibody"}${extractedData?.casNumbers?.length ? ` (CAS: ${extractedData.casNumbers.join(", ")})` : ""}

**Applicable GIR Rules:** 
- GIR 1: Classification by terms of heading 3002
- GIR 3(b): Essential character given by active pharmaceutical ingredient
- GIR 5: Packaging (vials, syringes) does not affect classification

**Chapter Notes Applied:**
- Chapter 30 Note 2: Heading 3002 covers immunological products including monoclonal antibodies
- Subheading 3002.15: Immunological products put up in measured doses or retail

**Exclusions Verified:**
- Not a food supplement (Chapter 21 exclusion verified)
- Not a blood albumin for non-therapeutic use

**Confidence Reasoning:** High confidence - Monoclonal antibodies have well-established classification under 3002.15

---

**Legal Justification Memo:**

This product is classified under HS 3002.15.00.00 based on:
1. The product is a monoclonal antibody, which is an immunological product per Chapter 30 Note 2
2. It is put up in measured doses for therapeutic use
3. GIR 3(b) confirms the active ingredient (monoclonal antibody) provides essential character
4. Packaging materials do not affect classification per GIR 5

**Note: This is DEMO data. Connect to the backend API for real classifications.**`;
  } else if (hasVaccine) {
    hsCode = "3002.41.00.00";
    confidence = 0.82;
    productType = "Vaccine for human medicine";
    memo = `**⚠️ DEMO MODE - This is a simulated classification**

**Classification Analysis for Vaccine**

**Product Type:** ${productType}

**Applicable GIR Rules:** GIR 1, Chapter 30 Note 2

**Chapter Notes Applied:** 3002.41 - Vaccines for human medicine

**Confidence Reasoning:** High confidence - Vaccines have clear classification under 3002.41

**Note: This is DEMO data. Connect to the backend API for real classifications.**`;
  } else if (hasInsulin) {
    hsCode = "3004.31.00.00";
    confidence = 0.88;
    productType = "Insulin preparation";
    memo = `**⚠️ DEMO MODE - This is a simulated classification**

**Classification Analysis for Insulin**

**Product Type:** ${productType}

**Applicable GIR Rules:** GIR 1, heading 3004.31

**Confidence Reasoning:** High confidence - Insulin preparations clearly fall under 3004.31

**Note: This is DEMO data. Connect to the backend API for real classifications.**`;
  } else if (hasAntibiotic) {
    hsCode = "3004.20.00.00";
    confidence = 0.80;
    productType = "Antibiotic preparation";
    memo = `**⚠️ DEMO MODE - This is a simulated classification**

**Classification Analysis for Antibiotic**

**Product Type:** ${productType}

**Applicable GIR Rules:** GIR 1, heading 3004.20

**Confidence Reasoning:** Medium-high confidence - Antibiotics in retail form under 3004.20

**Note: This is DEMO data. Connect to the backend API for real classifications.**`;
  } else {
    memo = `**⚠️ DEMO MODE - This is a simulated classification**

**Classification Analysis**

**Product Type:** General pharmaceutical product (insufficient detail to classify more specifically)

**Confidence Reasoning:** Low confidence - Limited product information provided. Default classification to 3004.90.00.00 (other medicaments).

**Recommendation:** Provide more detailed product information including:
- Active ingredient(s) and their function
- Whether the product is for therapeutic/prophylactic use
- Dosage form and packaging
- Intended medical use

**Note: This is DEMO data. Connect to the backend API for real classifications.**`;
  }

  return {
    hs_code: hsCode,
    memo,
    partial_accuracy: `6-digit match: ${(confidence * 100).toFixed(1)}%`,
    confidence,
    six_digit_match: confidence >= 0.8 ? "High confidence" : confidence >= 0.65 ? "Medium confidence" : "Low confidence - verify",
    is_demo_mode: true,
  };
}

// Follow-up question interface
export interface FollowUpResponse {
  response: string;
  conversation_history: Array<{role: string; content: string}>;
  session_id: string;
}

// Ask a follow-up question about a classification
export async function askFollowUp(
  sessionId: string,
  question: string,
  conversationHistory: Array<{role: string; content: string}>
): Promise<FollowUpResponse> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(USE_PYTHON_BACKEND ? {} : {
      "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    }),
  };

  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({
      session_id: sessionId,
      follow_up_question: question,
      conversation_history: conversationHistory,
    }),
  });

  if (!response.ok) {
    throw new Error(`Follow-up failed (${response.status})`);
  }

  return response.json();
}
