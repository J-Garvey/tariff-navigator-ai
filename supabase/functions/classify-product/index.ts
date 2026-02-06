import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// EU TARIC Chapter 30 Rules - embedded for classification reference
const EU_TARIC_CHAPTER_30_RULES = `
=== EU TARIC CHAPTER 30: PHARMACEUTICAL PRODUCTS ===

CHAPTER NOTES:
1. This chapter does NOT cover:
   (a) Foods or beverages (Chapter 21, 22), food supplements (heading 2106)
   (b) Plasters specially calcined for dentistry (heading 2520)
   (c) Aqueous distillates of essential oils (heading 3301)
   (d) Preparations of headings 3303 to 3307
   (e) Soap containing medicaments (heading 3401)
   (f) Preparations with basis of plaster for dentistry (heading 3407)
   (g) Blood albumin not for therapeutic/prophylactic use (heading 3502)

2. For heading 3002:
   - Includes immunological products (vaccines, toxins, cultures of micro-organisms)
   - Monoclonal antibodies are classified here
   - Blood fractions and modified immunological products

3. For headings 3003 and 3004:
   - 3003: Medicaments not put up in measured doses or retail packing
   - 3004: Medicaments put up in measured doses or retail packing

HEADING STRUCTURE:
- 3001: Glands and organs; extracts thereof
- 3002: Human/animal blood; antisera; vaccines; toxins; cultures
  - 3002.12: Antisera and blood fractions
  - 3002.13: Immunological products, unmixed
  - 3002.14: Immunological products, mixed
  - 3002.15: Immunological products, put up in measured doses or retail
  - 3002.41: Vaccines for human medicine
  - 3002.42: Vaccines for veterinary medicine
  - 3002.49: Toxins, cultures
  - 3002.90: Other
- 3003: Medicaments (not retail)
- 3004: Medicaments (retail)
  - 3004.10: Containing penicillins/streptomycins
  - 3004.20: Containing other antibiotics
  - 3004.31-39: Containing hormones
  - 3004.41-49: Containing alkaloids
  - 3004.50: Containing vitamins
  - 3004.60: Containing antimalarial active principles
  - 3004.90: Other
- 3005: Wadding, bandages, dressings
- 3006: Pharmaceutical goods (sutures, blood-grouping reagents, etc.)

GENERAL INTERPRETIVE RULES (GIRs):
GIR 1: Classification determined by terms of headings and Section/Chapter Notes
GIR 2(a): Incomplete/unfinished articles classified with complete articles
GIR 2(b): Mixtures classified as if consisting of single material
GIR 3(a): Most specific description preferred
GIR 3(b): Mixtures/composite goods - essential character determines classification
GIR 3(c): Last in numerical order if (a) and (b) fail
GIR 5: Packing materials classified with contents (packaging doesn't change classification)
GIR 6: Subheading classification follows same rules

COMMON CLASSIFICATIONS:
- Monoclonal antibodies (pembrolizumab, nivolumab, etc.): 3002.15.00.00
- Vaccines for human medicine: 3002.41.00.00
- Insulin preparations: 3004.31.00.00
- Antibiotics (retail): 3004.20.00.00
- General pharmaceuticals (retail, NES): 3004.90.00.00
`;

// Valid HS code prefixes for pharmaceutical products (Chapter 30)
const VALID_HS_PREFIXES = [
  "3001", "3002", "3003", "3004", "3005", "3006"
];

// System prompt with structured JSON output requirement
const BIO_CLASSIFY_SYSTEM_PROMPT = `You are a pharmaceutical customs classification expert. Your job is to determine the correct 10-digit HS/TARIC code for pharmaceutical and biological products using the General Interpretative Rules (GIRs) and the EU TARIC Chapter 30 rules provided.

Follow this thinking process for every product:

1. **Deconstruct the Product**
   - Identify: Active Ingredient(s) vs Excipient(s) vs packaging (vial, cap, syringe, etc.).
   - Example: "10ml Vial of Pembrolizumab with saline buffer" → Active: Pembrolizumab. Excipient: Saline. Container: Vial.

2. **Exclusion Check (Safety Net)**
   - Check Chapter 30 Note 1 from the EU TARIC rules: Is this actually a food supplement, blood fraction not for therapy, or something excluded from Chapter 30? If yes, do not classify under Chapter 30.

3. **Essential Character Test (GIR 3b)**
   - The product may have multiple components (e.g. glass vial Ch 70, plastic cap Ch 39, liquid drug Ch 30). The component that gives the product its essential character (usually the active pharmaceutical ingredient) determines the chapter.
   - For medicines/biologics: the drug typically gives the value and essential character → Chapter 30.

4. **Match to EU TARIC Codes**
   - Compare the product against the EU TARIC Chapter 30 heading structure provided.
   - Select the most specific applicable code.

5. **Assess Confidence**
   - Rate your confidence based on:
     - How clearly the product matches a specific heading (high if exact match)
     - Quality/completeness of product information provided
     - Whether there are any ambiguous characteristics

YOU MUST RESPOND WITH VALID JSON ONLY. No markdown, no extra text. Use this exact format:
{
  "hs_code": "XXXX.XX.XX.XX",
  "confidence": 0.XX,
  "confidence_reasoning": "Brief explanation of confidence level",
  "classification_reasoning": {
    "product_type": "What type of product this is",
    "active_ingredient": "Identified active ingredient(s)",
    "applicable_gir": "Which GIR rules applied",
    "chapter_notes_applied": "Which Chapter 30 notes were relevant",
    "exclusions_checked": "What exclusions were verified"
  },
  "legal_memo": "Full legal justification memo for customs audit, citing specific rules and notes"
}`;

interface ClassificationRequest {
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

// Google Gemini API configuration
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Helper function to call Gemini API
async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limited - please try again later");
    }
    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ClassificationRequest = await req.json();

    // Build the prompt following toby/buildPrompt.py structure
    const userPrompt = buildUserPrompt(requestData);

    // Call Gemini API
    const content = await callGemini(BIO_CLASSIFY_SYSTEM_PROMPT, userPrompt);

    // Parse the LLM response to extract HS code, memo, and metrics
    const result = parseClassificationResponse(content);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Classification error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Classification failed" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildUserPrompt(data: ClassificationRequest): string {
  const parts = [
    "=== EU TARIC CHAPTER 30 RULES (USE FOR CLASSIFICATION) ===",
    EU_TARIC_CHAPTER_30_RULES,
    "",
    "=== PRODUCT SPECIFICATION (FROM PDF) ===",
    data.extracted_text || "(No PDF text provided)",
    "",
    "=== PRODUCT DATA ===",
    `Product Description: ${data.product_description || "(Not provided)"}`,
  ];

  if (data.cas_numbers?.length) {
    parts.push(`CAS Numbers: ${data.cas_numbers.join(", ")}`);
  }
  if (data.active_ingredients?.length) {
    parts.push(`Active Ingredients: ${data.active_ingredients.join(", ")}`);
  }
  if (data.chemical_composition?.length) {
    parts.push(`Chemical Composition: ${data.chemical_composition.join(", ")}`);
  }
  if (data.safety_warnings?.length) {
    parts.push(`Safety Warnings: ${data.safety_warnings.join(", ")}`);
  }
  if (data.formulation?.length) {
    parts.push(`Formulation: ${data.formulation.join(", ")}`);
  }
  if (data.packaging?.length) {
    parts.push(`Packaging: ${data.packaging.join(", ")}`);
  }
  if (data.therapeutic_use?.length) {
    parts.push(`Therapeutic Use: ${data.therapeutic_use.join(", ")}`);
  }
  if (data.manufacturer) {
    parts.push(`Manufacturer: ${data.manufacturer}`);
  }
  if (data.storage) {
    parts.push(`Storage: ${data.storage}`);
  }

  parts.push(
    "",
    "=== TASK ===",
    "Based on the EU TARIC rules, product specification, and product data above, determine the correct 10-digit HS/TARIC code.",
    "RESPOND WITH VALID JSON ONLY following the format specified in your instructions."
  );

  return parts.join("\n");
}

// Validate HS code format and prefix
function validateHsCode(code: string): { valid: boolean; normalized: string; error?: string } {
  // Remove spaces and normalize
  const normalized = code.replace(/\s/g, "").replace(/\.+/g, ".");
  
  // Check format: should be like 3002.15.00.00 or 3002150000
  const withDotsMatch = normalized.match(/^(\d{4})\.(\d{2})\.(\d{2})\.(\d{2})$/);
  const withoutDotsMatch = normalized.match(/^(\d{10})$/);
  
  let prefix: string;
  let formattedCode: string;
  
  if (withDotsMatch) {
    prefix = withDotsMatch[1];
    formattedCode = normalized;
  } else if (withoutDotsMatch) {
    const digits = withoutDotsMatch[1];
    prefix = digits.substring(0, 4);
    formattedCode = `${digits.substring(0, 4)}.${digits.substring(4, 6)}.${digits.substring(6, 8)}.${digits.substring(8, 10)}`;
  } else {
    return { valid: false, normalized: code, error: "Invalid HS code format" };
  }
  
  // Check if prefix is valid for Chapter 30
  if (!VALID_HS_PREFIXES.includes(prefix)) {
    return { 
      valid: false, 
      normalized: formattedCode, 
      error: `HS code prefix ${prefix} is not in Chapter 30 (valid: ${VALID_HS_PREFIXES.join(", ")})` 
    };
  }
  
  return { valid: true, normalized: formattedCode };
}

interface LLMClassificationResponse {
  hs_code: string;
  confidence: number;
  confidence_reasoning: string;
  classification_reasoning: {
    product_type: string;
    active_ingredient: string;
    applicable_gir: string;
    chapter_notes_applied: string;
    exclusions_checked: string;
  };
  legal_memo: string;
}

function parseClassificationResponse(content: string): {
  hs_code: string;
  memo: string;
  partial_accuracy: string;
  confidence: number;
  six_digit_match: string;
  validation_warning?: string;
} {
  let parsed: LLMClassificationResponse;
  
  try {
    // Try to extract JSON from the response (handle potential markdown wrapping)
    let jsonContent = content.trim();
    
    // Remove markdown code blocks if present
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    
    parsed = JSON.parse(jsonContent);
  } catch (e) {
    console.error("Failed to parse LLM JSON response:", e, "Content:", content);
    
    // Fallback: try to extract HS code with regex
    const hsCodeMatch = content.match(/\b(\d{4}\.?\d{2}\.?\d{2}\.?\d{2})\b/);
    const hs_code = hsCodeMatch ? hsCodeMatch[1] : "3004.90.00.00";
    
    return {
      hs_code,
      memo: content,
      partial_accuracy: "Unable to parse structured response",
      confidence: 0.5, // Low confidence for unparseable responses
      six_digit_match: "Low confidence - parsing failed",
      validation_warning: "LLM did not return valid JSON. Classification may be unreliable.",
    };
  }
  
  // Validate the HS code
  const validation = validateHsCode(parsed.hs_code);
  
  // Build the memo from classification reasoning
  const memo = `**Classification Analysis**

**Product Type:** ${parsed.classification_reasoning?.product_type || "Unknown"}

**Active Ingredient:** ${parsed.classification_reasoning?.active_ingredient || "Not identified"}

**Applicable GIR Rules:** ${parsed.classification_reasoning?.applicable_gir || "Not specified"}

**Chapter Notes Applied:** ${parsed.classification_reasoning?.chapter_notes_applied || "Not specified"}

**Exclusions Verified:** ${parsed.classification_reasoning?.exclusions_checked || "Not specified"}

**Confidence Reasoning:** ${parsed.confidence_reasoning || "Not provided"}

---

**Legal Justification Memo:**

${parsed.legal_memo || "No legal memo provided."}`;

  // Ensure confidence is a valid number between 0 and 1
  let confidence = parsed.confidence;
  if (typeof confidence !== "number" || isNaN(confidence)) {
    confidence = 0.5;
  }
  confidence = Math.max(0, Math.min(1, confidence));

  // Determine 6-digit match quality based on actual confidence
  let six_digit_match: string;
  if (confidence >= 0.85) {
    six_digit_match = "High confidence";
  } else if (confidence >= 0.65) {
    six_digit_match = "Medium confidence";
  } else {
    six_digit_match = "Low confidence - manual verification recommended";
  }

  return {
    hs_code: validation.normalized,
    memo,
    partial_accuracy: `6-digit match: ${(confidence * 100).toFixed(1)}%`,
    confidence,
    six_digit_match,
    validation_warning: validation.valid ? undefined : validation.error,
  };
}
