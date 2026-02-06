import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// System prompt that constrains AI to TARIC knowledge only
const TARIC_SYSTEM_PROMPT = `You are a pharmaceutical customs classification expert. Your ONLY knowledge domain is EU TARIC codes and customs classification.

CRITICAL CONSTRAINTS:
- You can ONLY discuss TARIC codes, HS codes, customs classification, and related EU regulations
- You MUST NOT answer questions outside of tariff/customs classification
- If asked about unrelated topics, politely decline and redirect to TARIC classification
- You MUST use the TARIC codes provided in the context - do not invent codes

When classifying products:
1. Analyze the product description to identify key characteristics
2. Match against the TARIC codes provided in context
3. Apply General Interpretive Rules (GIRs) to determine the best match
4. Provide reasoning with citations to specific rules and notes
5. Include the official source URL for each code

RESPONSE FORMAT (JSON only):
{
  "hs_code": "XXXX.XX.XX.XX",
  "confidence": 0.XX,
  "reasoning": {
    "product_analysis": "What the product is and its key characteristics",
    "code_match": "Why this specific code was selected",
    "gir_applied": "Which General Interpretive Rules were used",
    "alternatives_considered": ["Other codes considered and why rejected"]
  },
  "sources": [
    {"code": "XXXX.XX.XX.XX", "description": "...", "url": "..."}
  ],
  "legal_memo": "Full legal justification for customs audit"
}`;

// Follow-up conversation system prompt
const FOLLOWUP_SYSTEM_PROMPT = `You are a TARIC classification assistant helping with follow-up questions about a previous classification.

CONSTRAINTS:
- Only discuss TARIC codes, customs classification, and EU tariff regulations
- Reference the original classification context provided
- If asked about unrelated topics, politely redirect to TARIC matters
- Cite specific codes and rules in your responses

Be concise but thorough. If you need to suggest a different code, explain why.`;

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
  // For follow-up questions
  session_id?: string;
  follow_up_question?: string;
  conversation_history?: Array<{role: string; content: string}>;
}

interface TaricCode {
  code: string;
  description: string;
  chapter: string;
  heading: string;
  source_url: string;
}

// Search TARIC database for relevant codes
async function searchTaricCodes(query: string, limit: number = 20): Promise<TaricCode[]> {
  // Try fuzzy text search
  const { data, error } = await supabase
    .from("taric_codes")
    .select("code, description, chapter, heading, source_url")
    .or(`description.ilike.%${query}%,description_short.ilike.%${query}%`)
    .limit(limit);

  if (error) {
    console.error("TARIC search error:", error);
    return [];
  }

  return data || [];
}

// Search by keywords extracted from product description
async function findRelevantCodes(productData: ClassificationRequest): Promise<TaricCode[]> {
  const searchTerms: string[] = [];
  
  // Extract key terms from various fields
  if (productData.product_description) {
    searchTerms.push(...productData.product_description.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  }
  if (productData.active_ingredients?.length) {
    searchTerms.push(...productData.active_ingredients);
  }
  if (productData.therapeutic_use?.length) {
    searchTerms.push(...productData.therapeutic_use);
  }
  if (productData.formulation?.length) {
    searchTerms.push(...productData.formulation);
  }

  // Key pharmaceutical terms to search for
  const pharmaKeywords = [
    "vaccine", "antibody", "monoclonal", "immunological", "insulin",
    "antibiotic", "penicillin", "hormone", "vitamin", "steroid",
    "tablet", "capsule", "injection", "infusion", "cream", "ointment",
    "syrup", "solution", "suspension", "powder", "diagnostic"
  ];

  const matchedKeywords = pharmaKeywords.filter(kw => 
    searchTerms.some(term => term.includes(kw) || kw.includes(term))
  );

  // Always include Chapter 30 (pharmaceuticals) codes
  const { data: chapterCodes, error: chapterError } = await supabase
    .from("taric_codes")
    .select("code, description, chapter, heading, source_url")
    .eq("chapter", "30")
    .limit(50);

  if (chapterError) {
    console.error("Chapter search error:", chapterError);
  }

  // Search by matched keywords
  let keywordResults: TaricCode[] = [];
  for (const keyword of matchedKeywords.slice(0, 5)) {
    const results = await searchTaricCodes(keyword, 10);
    keywordResults.push(...results);
  }

  // Deduplicate
  const seen = new Set<string>();
  const allCodes = [...(chapterCodes || []), ...keywordResults].filter(code => {
    if (seen.has(code.code)) return false;
    seen.add(code.code);
    return true;
  });

  return allCodes.slice(0, 30); // Limit context size
}

// Validate that a code exists in the database
async function validateCode(code: string): Promise<{valid: boolean; data?: TaricCode; error?: string}> {
  // Normalize the code format
  const normalized = code.replace(/\s/g, "").replace(/\.+/g, ".");
  
  const { data, error } = await supabase
    .from("taric_codes")
    .select("code, description, chapter, heading, source_url")
    .eq("code", normalized)
    .single();

  if (error || !data) {
    // Try partial match (6-digit)
    const sixDigit = normalized.replace(/\./g, "").substring(0, 6);
    const { data: partialData } = await supabase
      .from("taric_codes")
      .select("code, description, chapter, heading, source_url")
      .like("code", `${sixDigit.substring(0, 4)}.${sixDigit.substring(4, 6)}%`)
      .limit(1)
      .single();

    if (partialData) {
      return {
        valid: false,
        data: partialData,
        error: `Code ${normalized} not found in database. Closest match: ${partialData.code}`
      };
    }
    
    return { valid: false, error: `Code ${normalized} not found in TARIC database` };
  }

  return { valid: true, data };
}

// Get chapter notes for context
async function getChapterNotes(chapter: string): Promise<string> {
  const { data } = await supabase
    .from("taric_chapters")
    .select("notes")
    .eq("chapter", chapter)
    .single();

  return data?.notes || "";
}

// Save classification to history
async function saveClassification(
  sessionId: string,
  request: ClassificationRequest,
  result: any
): Promise<void> {
  try {
    await supabase.from("classification_history").insert({
      session_id: sessionId,
      product_description: request.product_description,
      extracted_data: {
        cas_numbers: request.cas_numbers,
        active_ingredients: request.active_ingredients,
        formulation: request.formulation,
        packaging: request.packaging,
      },
      classified_code: result.hs_code,
      confidence: result.confidence,
      reasoning: JSON.stringify(result.reasoning),
      legal_memo: result.legal_memo,
      sources: result.sources?.map((s: any) => s.url) || [],
      conversation_history: request.conversation_history || [],
    });
  } catch (e) {
    console.error("Error saving classification:", e);
  }
}

// Build prompt with TARIC context from database
function buildPromptWithContext(
  request: ClassificationRequest,
  taricCodes: TaricCode[],
  chapterNotes: string
): string {
  const parts = [
    "=== AVAILABLE TARIC CODES (from database) ===",
    "You MUST select from these codes. Do NOT invent codes.",
    "",
    ...taricCodes.map(c => `${c.code}: ${c.description}`),
    "",
    "=== CHAPTER 30 NOTES ===",
    chapterNotes || "(No chapter notes available)",
    "",
    "=== PRODUCT SPECIFICATION ===",
    request.extracted_text || "(No specification text provided)",
    "",
    "=== PRODUCT DATA ===",
    `Description: ${request.product_description || "(Not provided)"}`,
  ];

  if (request.cas_numbers?.length) {
    parts.push(`CAS Numbers: ${request.cas_numbers.join(", ")}`);
  }
  if (request.active_ingredients?.length) {
    parts.push(`Active Ingredients: ${request.active_ingredients.join(", ")}`);
  }
  if (request.formulation?.length) {
    parts.push(`Formulation: ${request.formulation.join(", ")}`);
  }
  if (request.packaging?.length) {
    parts.push(`Packaging: ${request.packaging.join(", ")}`);
  }
  if (request.therapeutic_use?.length) {
    parts.push(`Therapeutic Use: ${request.therapeutic_use.join(", ")}`);
  }

  parts.push(
    "",
    "=== TASK ===",
    "Classify this pharmaceutical product using ONLY the TARIC codes listed above.",
    "Respond with valid JSON following your instruction format."
  );

  return parts.join("\n");
}

// Handle follow-up questions
async function handleFollowUp(
  sessionId: string,
  question: string,
  conversationHistory: Array<{role: string; content: string}>
): Promise<any> {
  // Get the original classification context
  const { data: history } = await supabase
    .from("classification_history")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const context = history ? `
Previous classification:
- Product: ${history.product_description}
- Classified as: ${history.classified_code}
- Confidence: ${history.confidence}
` : "";

  // Build conversation as single prompt for Gemini
  const conversationText = conversationHistory
    .map(msg => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n");
  
  const fullPrompt = `${conversationText}\n\nUser: ${question}`;
  const systemWithContext = FOLLOWUP_SYSTEM_PROMPT + "\n\n" + context;

  const content = await callGemini(systemWithContext, fullPrompt);

  // Update conversation history
  const newHistory = [
    ...conversationHistory,
    { role: "user", content: question },
    { role: "assistant", content }
  ];

  // Save to database
  if (history) {
    await supabase
      .from("classification_history")
      .update({ conversation_history: newHistory })
      .eq("id", history.id);
  }

  return {
    response: content,
    conversation_history: newHistory,
    session_id: sessionId,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ClassificationRequest = await req.json();

    // Handle follow-up questions
    if (requestData.follow_up_question && requestData.session_id) {
      const result = await handleFollowUp(
        requestData.session_id,
        requestData.follow_up_question,
        requestData.conversation_history || []
      );
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate session ID for new classifications
    const sessionId = requestData.session_id || crypto.randomUUID();

    // 1. Search TARIC database for relevant codes
    console.log("Searching TARIC database for relevant codes...");
    const relevantCodes = await findRelevantCodes(requestData);
    console.log(`Found ${relevantCodes.length} relevant TARIC codes`);

    // 2. Get chapter notes
    const chapterNotes = await getChapterNotes("30");

    // 3. Build prompt with database context
    const userPrompt = buildPromptWithContext(requestData, relevantCodes, chapterNotes);

    // 4. Call Gemini with constrained context
    const content = await callGemini(TARIC_SYSTEM_PROMPT, userPrompt);

    // 5. Parse LLM response
    let parsed: any;
    try {
      let jsonContent = content.trim();
      if (jsonContent.startsWith("```json")) {
        jsonContent = jsonContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (jsonContent.startsWith("```")) {
        jsonContent = jsonContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      parsed = JSON.parse(jsonContent);
    } catch (e) {
      console.error("Failed to parse LLM JSON:", e);
      parsed = {
        hs_code: "3004.90.00.00",
        confidence: 0.5,
        reasoning: { error: "Failed to parse LLM response" },
        legal_memo: content,
      };
    }

    // 6. VALIDATE CODE AGAINST DATABASE (prevents hallucination)
    const validation = await validateCode(parsed.hs_code);
    let validationWarning: string | undefined;
    
    if (!validation.valid) {
      validationWarning = validation.error;
      // If we found a close match, suggest it
      if (validation.data) {
        parsed.suggested_code = validation.data.code;
        parsed.suggested_description = validation.data.description;
      }
    }

    // 7. Build final response
    const result = {
      hs_code: validation.valid ? parsed.hs_code : (validation.data?.code || parsed.hs_code),
      confidence: parsed.confidence || 0.5,
      memo: parsed.legal_memo || "No legal memo provided",
      partial_accuracy: `6-digit match: ${((parsed.confidence || 0.5) * 100).toFixed(1)}%`,
      six_digit_match: parsed.confidence >= 0.85 ? "High confidence" : 
                       parsed.confidence >= 0.65 ? "Medium confidence" : 
                       "Low confidence - manual verification recommended",
      reasoning: parsed.reasoning,
      sources: (parsed.sources || []).map((s: any) => ({
        code: s.code,
        description: s.description,
        url: s.url || `https://ec.europa.eu/taxation_customs/dds2/taric/measures.jsp?Taric=${s.code?.replace(/\./g, '')}`
      })),
      validation_warning: validationWarning,
      session_id: sessionId,
      database_validated: validation.valid,
    };

    // 8. Save to history
    await saveClassification(sessionId, requestData, result);

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
