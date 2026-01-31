"""
Assembles the prompt for Bio-Classify AI: PDF spec text + product data + EU TARIC rules (from PDF) + system prompt.
Calls the LLM to get HS/TARIC code + Explanation + Sources + Legal Justification Memo.
"""

from callLLM2 import callLLM
import pdfplumber


# System prompt: reasoning process (GIRs, exclusion, essential character, output format) - updated for sources and comparison
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

5. **Output Format**
   - HS/TARIC Code: The correct 10-digit code (e.g. 3002.15.0000).
   - Explanation: Step-by-step reasoning, including direct comparisons to EU TARIC rules.
   - Sources: List of citations from the EU TARIC PDF (e.g., "Chapter 30 Note 2 (Page 1)", "CN code 3002.15.00 (Page 3)").
   - Legal Justification Memo: A short audit-ready memo citing relevant Section Notes, GIRs, and PDF sources."""


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
        taric_pdf_path: Path to EU TARIC PDF for rules comparison.
        systemPrompt: System/instruction block. Defaults to BIO_CLASSIFY_SYSTEM_PROMPT.

    Returns:
        str: The assembled prompt text sent to the LLM.
    """
    taric_rules = extract_pdf_text(taric_pdf_path)  # Extract rules from EU TARIC PDF
    parts = [
        "--- SYSTEM INSTRUCTIONS ---",
        systemPrompt,
        "",
        "--- EU TARIC CHAPTER 30 RULES (FOR COMPARISON) ---",
        taric_rules,
        "",
        "--- PRODUCT SPECIFICATION (PDF) ---",
        pdfText.strip(),
        "",
        "--- PRODUCT DATA ---",
        productData.strip(),
        "",
        "--- TASK ---",
        "Based on the product specification, product data, and EU TARIC rules above, determine the correct 10-digit HS/TARIC code. Provide the Explanation, Sources from the EU TARIC PDF, and Legal Justification Memo.",
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
        str: The LLM response (code + explanation + sources + defense memo).
    """
    prompt = buildPrompt(pdfText, productData, taric_pdf_path, systemPrompt)
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