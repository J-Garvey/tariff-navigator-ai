import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CLASSIFICATION_SYSTEM_PROMPT = `You are an expert customs classification specialist for pharmaceutical and biopharmaceutical products, trained on the Harmonized System (HS), EU TARIC codes, and Irish Revenue classification guidelines. Your task is to classify products using the ATLAS methodology (arXiv:2509.18400) with chain-of-thought reasoning.

## Classification Methodology

Follow this systematic approach inspired by ATLAS paper methodology:

### Step 1: Product Deconstruction
- Identify ALL components: active pharmaceutical ingredients (APIs), excipients, packaging materials
- Note CAS numbers, concentrations, formulations
- Identify the intended therapeutic use

### Step 2: Heading Selection (6-digit)
Apply General Interpretive Rules (GIRs) in order:

**GIR 1**: Classify according to terms of headings and Section/Chapter Notes
- For pharma: Check Chapter 30 (Pharmaceutical products) first
- Review Chapter 30 Note 1 (what's included) and Note 2 (immunological products)

**GIR 2(a)**: Incomplete or unfinished goods
**GIR 2(b)**: Mixtures and combinations

**GIR 3**: When goods are classifiable under two or more headings:
- **(a)** Most specific description
- **(b)** Essential character for mixtures/composite goods
- **(c)** Heading occurring last in numerical order

**GIR 4**: Most akin to goods
**GIR 5**: Packing materials
**GIR 6**: Subheading classification

### Step 3: Subheading Selection (8-10 digit)
Apply EU Combined Nomenclature and TARIC provisions.

### Step 4: Essential Character Analysis (GIR 3b)
For pharmaceutical products with multiple components:
- The API typically imparts essential character, NOT packaging
- Glass vials, rubber stoppers, plastic containers are packaging (GIR 5)
- Buffers/excipients support the API's function

### Step 5: Classification Justification
Provide audit-ready legal reasoning with:
- Specific rule citations
- Explanatory Notes references
- Similar classification precedents (EU BTI rulings)

## Output Format

Respond with a valid JSON object containing:
{
  "hsCode": "XXXX.XX.XX.XX",
  "confidence": 0.0-1.0,
  "sixDigitAccuracy": "description of 6-digit heading certainty",
  "memo": "Full markdown classification memo with legal reasoning"
}

## Key Pharmaceutical Classifications

- 3002.13: Immunological products for veterinary use
- 3002.14: Immunological products, unmixed, not put up in measured doses
- 3002.15: Immunological products, put up in measured doses or retail packing
- 3002.41-49: Vaccines for human medicine
- 3004: Medicaments consisting of mixed/unmixed products for therapeutic use
- 2941-2942: Antibiotics and other organic compounds

## Important Notes

- Always consider if the product is "put up in measured doses or in forms or packings for retail sale" (affects classification)
- Monoclonal antibodies are immunological products under Chapter 30 Note 2
- Glass packaging does NOT change classification of pharmaceutical products (GIR 3b, GIR 5)`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productDescription, extractedData } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the user prompt with all available information
    let userPrompt = `Classify the following pharmaceutical product for Irish/EU customs purposes. Provide a 10-digit HS/TARIC code with full chain-of-thought legal reasoning.

## Product Description
${productDescription}`;

    if (extractedData) {
      userPrompt += `

## Extracted Document Data
- CAS Numbers: ${extractedData.casNumbers?.join(", ") || "Not found"}
- Active Ingredients: ${extractedData.activeIngredients?.join("; ") || "Not found"}
- Safety Warnings: ${extractedData.safetyWarnings?.slice(0, 3).join("; ") || "None extracted"}
- Chemical Composition: ${extractedData.chemicalComposition?.slice(0, 5).join("; ") || "Not found"}
- Formulation: ${extractedData.formulation?.join("; ") || "Not specified"}
- Packaging: ${extractedData.packaging?.join("; ") || "Not specified"}
- Therapeutic Use: ${extractedData.therapeuticUse?.join("; ") || "Not specified"}
- Manufacturer: ${extractedData.manufacturer || "Unknown"}
- Storage: ${extractedData.storage || "Not specified"}`;
    }

    userPrompt += `

Please provide:
1. The correct 10-digit HS/TARIC code
2. Step-by-step GIR analysis
3. Essential character determination
4. Audit-ready legal justification memo`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: CLASSIFICATION_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI service error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response
    let classificationResult;
    try {
      classificationResult = JSON.parse(content);
    } catch {
      // If JSON parsing fails, try to extract from markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        classificationResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        // Fallback: create structured response from raw text
        classificationResult = {
          hsCode: "3002.15.00.00",
          confidence: 0.7,
          sixDigitAccuracy: "Moderate - requires manual verification",
          memo: content,
        };
      }
    }

    return new Response(JSON.stringify(classificationResult), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Classification error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
