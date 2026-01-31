"""
Assembles the prompt for Bio-Classify AI: PDF spec text + product data + system prompt.
Calls the LLM to get HS/TARIC code + Legal Justification Memo.
"""

from callLLM2 import callLLM


# System prompt: reasoning process (GIRs, exclusion, essential character, output format)
BIO_CLASSIFY_SYSTEM_PROMPT = """You are a pharmaceutical customs classification expert. Your job is to determine the correct 10-digit HS/TARIC code for pharmaceutical and biological products using the General Interpretative Rules (GIRs).

Follow this thinking process for every product:

1. **Deconstruct the Product**
   - Identify: Active Ingredient(s) vs Excipient(s) vs packaging (vial, cap, syringe, etc.).
   - Example: "10ml Vial of Pembrolizumab with saline buffer" → Active: Pembrolizumab. Excipient: Saline. Container: Vial.

2. **Exclusion Check (Safety Net)**
   - Check Chapter 30 Note 1: Is this actually a food supplement, blood fraction, or something excluded from Chapter 30? If yes, do not classify under Chapter 30.

3. **Essential Character Test (GIR 3b)**
   - The product may have multiple components (e.g. glass vial Ch 70, plastic cap Ch 39, liquid drug Ch 30). The component that gives the product its essential character (usually the active pharmaceutical ingredient) determines the chapter.
   - For medicines/biologics: the drug typically gives the value and essential character → Chapter 30.

4. **Output Format**
   - Give the correct 10-digit code (e.g. 3002.15.0000 for immunological products).
   - Then write a short Legal Justification Memo citing relevant Section Notes and GIRs, suitable for a Customs Auditor. Be specific and audit-ready."""


def buildPrompt(pdfText, productData, systemPrompt=BIO_CLASSIFY_SYSTEM_PROMPT):
    """
    Puts together the full prompt: system instructions + PDF spec text + product data.

    Args:
        pdfText: Long text from the Product Specification Sheet (PDF converted to text).
        productData: Additional text describing the product (e.g. short description, trade name).
        systemPrompt: System/instruction block. Defaults to BIO_CLASSIFY_SYSTEM_PROMPT.

    Returns:
        str: The assembled prompt text sent to the LLM.
    """
    parts = [
        "--- SYSTEM INSTRUCTIONS ---",
        systemPrompt,
        "",
        "--- PRODUCT SPECIFICATION (PDF) ---",
        pdfText.strip(),
        "",
        "--- PRODUCT DATA ---",
        productData.strip(),
        "",
        "--- TASK ---",
        "Based on the product specification and product data above, determine the correct 10-digit HS/TARIC code and provide the Legal Justification Memo.",
    ]
    return "\n".join(parts)


def runPrompt(pdfText, productData, systemPrompt=BIO_CLASSIFY_SYSTEM_PROMPT):
    """
    Builds the prompt and calls the LLM.

    Args:
        pdfText: Long text from the Product Specification Sheet (PDF).
        productData: Text describing the product.
        systemPrompt: System prompt. Defaults to BIO_CLASSIFY_SYSTEM_PROMPT.

    Returns:
        str: The LLM response (code + defense memo).
    """
    prompt = buildPrompt(pdfText, productData, systemPrompt)
    return callLLM(prompt)


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
