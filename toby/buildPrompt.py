"""
Assembles the prompt for Easy Ship AI: PDF spec text + product data + EU TARIC rules (from PDF) + system prompt.
Calls the LLM to get HS/TARIC code + Explanation + Sources + Legal Justification Memo.
Returns structured JSON output with confidence scores.
"""

from callLLM2 import callLLM
import pdfplumber
import json
import re
import os


# Embedded EU TARIC Chapter 30 rules (used when PDF not available)
EMBEDDED_TARIC_RULES = """
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
"""


# System prompt: reasoning process (GIRs, exclusion, essential character, output format) - updated for structured JSON output
BIO_CLASSIFY_SYSTEM_PROMPT = """You are a pharmaceutical customs classification expert. Your job is to determine the correct 10-digit HS/TARIC code for pharmaceutical and biological products using the General Interpretative Rules (GIRs) and comparing against the provided EU TARIC Chapter 30 rules from the PDF.

Follow this thinking process for every product, comparing explicitly to the EU TARIC rules:

1. **Deconstruct the Product**
   - Identify: Active Ingredient(s) vs Excipient(s) vs packaging (vial, cap, syringe, etc.).
   - Example: "10ml Vial of Pembrolizumab with saline buffer" → Active: Pembrolizumab. Excipient: Saline. Container: Vial.

2. **Exclusion Check (Safety Net)**
   - Compare to EU TARIC Chapter 30 Note 1: Is this actually a food supplement, blood fraction, or something excluded from Chapter 30? If yes, do not classify under Chapter 30. Cite specific exclusions from the PDF.

3. **Essential Character Test (GIR 3b)**
   - The product may have multiple components (e.g. glass vial Ch 70, plastic cap Ch 39, liquid drug Ch 30). The component that gives the product its essential character (usually the active pharmaceutical ingredient) determines the chapter.
   - For medicines/biologics: the drug typically gives the value and essential character → Chapter 30. Compare to PDF notes and CN codes (e.g., 3002 for immunological products).

4. **Comparison to EU TARIC CN Codes**
   - Scan the provided EU TARIC Chapter 30 CN codes and subheadings to find the best match (e.g., 3002.15.00 for immunological products like monoclonal antibodies). Explain why it matches or doesn't.

5. **Assess Confidence**
   - Rate your confidence (0.0 to 1.0) based on:
     - How clearly the product matches a specific heading
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
  "sources": ["List of citations from the EU TARIC PDF"],
  "legal_memo": "Full legal justification memo for customs audit, citing specific rules and notes"
}"""


def extract_pdf_text(pdf_path):
    """
    Extracts full text from a PDF file (e.g., EU TARIC rules).

    Args:
        pdf_path: Path to the PDF file.

    Returns:
        str: All text from the PDF.
    """
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() + "\n\n"
    return text.strip()


def buildPrompt(pdfText, productData, taric_pdf_path="EU TARIC PDF.pdf", systemPrompt=BIO_CLASSIFY_SYSTEM_PROMPT):
    """
    Puts together the full prompt: system instructions + EU TARIC rules (from PDF) + product spec text + product data.

    Args:
        pdfText: Long text from the Product Specification Sheet (PDF converted to text).
        productData: Additional text describing the product (e.g. short description, trade name).
        taric_pdf_path: Path to EU TARIC PDF for rules comparison. If None, uses embedded rules.
        systemPrompt: System/instruction block. Defaults to BIO_CLASSIFY_SYSTEM_PROMPT.

    Returns:
        str: The assembled prompt text sent to the LLM.
    """
    # Use EU TARIC PDF if available, otherwise use embedded rules
    if taric_pdf_path and os.path.exists(taric_pdf_path):
        taric_rules = extract_pdf_text(taric_pdf_path)
    else:
        taric_rules = EMBEDDED_TARIC_RULES
        
    parts = [
        "--- SYSTEM INSTRUCTIONS ---",
        systemPrompt,
        "",
        "--- EU TARIC CHAPTER 30 RULES (FOR COMPARISON) ---",
        taric_rules,
        "",
        "--- PRODUCT SPECIFICATION (PDF) ---",
        pdfText.strip() if pdfText else "(No PDF text provided)",
        "",
        "--- PRODUCT DATA ---",
        productData.strip() if productData else "(No product data provided)",
        "",
        "--- TASK ---",
        "Based on the product specification, product data, and EU TARIC rules above, determine the correct 10-digit HS/TARIC code. Respond with valid JSON only.",
    ]
    return "\n".join(parts)


def runPrompt(pdfText, productData, taric_pdf_path="EU TARIC PDF.pdf", systemPrompt=BIO_CLASSIFY_SYSTEM_PROMPT):
    """
    Builds the prompt (including EU TARIC comparison) and calls the LLM.

    Args:
        pdfText: Long text from the Product Specification Sheet (PDF).
        productData: Text describing the product.
        taric_pdf_path: Path to EU TARIC PDF.
        systemPrompt: System prompt. Defaults to BIO_CLASSIFY_SYSTEM_PROMPT.

    Returns:
        dict: Parsed classification result with hs_code, confidence, reasoning, etc.
              Falls back to raw string if JSON parsing fails.
    """
    prompt = buildPrompt(pdfText, productData, taric_pdf_path, systemPrompt)
    raw_response = callLLM(prompt)
    return parseClassificationResponse(raw_response)


def parseClassificationResponse(content):
    """
    Parse the LLM response JSON into a structured dictionary.
    
    Args:
        content: Raw LLM response string (should be JSON).
        
    Returns:
        dict: Parsed classification with validated fields.
    """
    try:
        # Remove markdown code blocks if present
        json_content = content.strip()
        if json_content.startswith("```json"):
            json_content = re.sub(r'^```json\s*', '', json_content)
            json_content = re.sub(r'\s*```$', '', json_content)
        elif json_content.startswith("```"):
            json_content = re.sub(r'^```\s*', '', json_content)
            json_content = re.sub(r'\s*```$', '', json_content)
        
        parsed = json.loads(json_content)
        
        # Validate and normalize the HS code
        hs_code = parsed.get("hs_code", "3004.90.00.00")
        validation = validateHsCode(hs_code)
        
        # Ensure confidence is valid
        confidence = parsed.get("confidence", 0.5)
        if not isinstance(confidence, (int, float)) or confidence < 0 or confidence > 1:
            confidence = 0.5
            
        return {
            "hs_code": validation["normalized"],
            "confidence": confidence,
            "confidence_reasoning": parsed.get("confidence_reasoning", "Not provided"),
            "classification_reasoning": parsed.get("classification_reasoning", {}),
            "sources": parsed.get("sources", []),
            "legal_memo": parsed.get("legal_memo", "No legal memo provided."),
            "validation_warning": validation.get("error"),
            "raw_response": content
        }
        
    except json.JSONDecodeError as e:
        print(f"Failed to parse LLM JSON response: {e}")
        
        # Fallback: try to extract HS code with regex
        hs_match = re.search(r'\b(\d{4}\.?\d{2}\.?\d{2}\.?\d{2})\b', content)
        hs_code = hs_match.group(1) if hs_match else "3004.90.00.00"
        
        return {
            "hs_code": hs_code,
            "confidence": 0.5,
            "confidence_reasoning": "LLM did not return valid JSON",
            "classification_reasoning": {},
            "sources": [],
            "legal_memo": content,  # Use raw content as memo
            "validation_warning": "LLM did not return valid JSON. Classification may be unreliable.",
            "raw_response": content
        }


# Valid HS code prefixes for pharmaceutical products (Chapter 30)
VALID_HS_PREFIXES = ["3001", "3002", "3003", "3004", "3005", "3006"]


def validateHsCode(code):
    """
    Validate HS code format and prefix for Chapter 30.
    
    Args:
        code: HS code string to validate.
        
    Returns:
        dict: {valid: bool, normalized: str, error?: str}
    """
    # Remove spaces and normalize dots
    normalized = code.replace(" ", "").replace("..", ".")
    
    # Check format: should be like 3002.15.00.00 or 3002150000
    with_dots = re.match(r'^(\d{4})\.(\d{2})\.(\d{2})\.(\d{2})$', normalized)
    without_dots = re.match(r'^(\d{10})$', normalized)
    
    if with_dots:
        prefix = with_dots.group(1)
        formatted_code = normalized
    elif without_dots:
        digits = without_dots.group(1)
        prefix = digits[:4]
        formatted_code = f"{digits[:4]}.{digits[4:6]}.{digits[6:8]}.{digits[8:10]}"
    else:
        return {"valid": False, "normalized": code, "error": "Invalid HS code format"}
    
    # Check if prefix is valid for Chapter 30
    if prefix not in VALID_HS_PREFIXES:
        return {
            "valid": False,
            "normalized": formatted_code,
            "error": f"HS code prefix {prefix} is not in Chapter 30 (valid: {', '.join(VALID_HS_PREFIXES)})"
        }
    
    return {"valid": True, "normalized": formatted_code}


if __name__ == "__main__":
    # Example: minimal PDF-like text + product data
    samplePdfText = """
    Product: Pembrolizumab concentrate for solution for infusion.
    Active substance: Pembrolizumab 25 mg/mL.
    Excipients: Sucrose, L-histidine, polysorbate 80, water for injections.
    Presentation: 10 mL vial (Type I glass) with rubber stopper and aluminium seal.
    Therapeutic indication: Oncology (melanoma, NSCLC, etc.).
    """

    sampleProductData = "10ml Vial of Pembrolizumab with saline buffer. Immunological product for IV infusion."

    prompt = buildPrompt(samplePdfText, sampleProductData)
    print("Prompt (first 1200 chars):\n", prompt[:1200], "\n...")
    print("\n--- LLM response ---\n")
    result = runPrompt(samplePdfText, sampleProductData)
    print(result)