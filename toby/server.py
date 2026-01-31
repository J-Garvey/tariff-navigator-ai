"""
FastAPI server that exposes the buildPrompt classification logic.
Run with: uvicorn server:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import tempfile
import os

from buildPrompt import runPrompt, extract_pdf_text, BIO_CLASSIFY_SYSTEM_PROMPT

app = FastAPI(
    title="Bio-Classify AI Backend",
    description="Pharmaceutical HS/TARIC classification using LLM",
    version="1.0.0"
)

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ClassificationRequest(BaseModel):
    extracted_text: str
    product_description: str
    cas_numbers: Optional[List[str]] = []
    active_ingredients: Optional[List[str]] = []
    safety_warnings: Optional[List[str]] = []
    chemical_composition: Optional[List[str]] = []
    formulation: Optional[List[str]] = []
    packaging: Optional[List[str]] = []
    therapeutic_use: Optional[List[str]] = []
    manufacturer: Optional[str] = None
    storage: Optional[str] = None


class ClassificationResponse(BaseModel):
    hs_code: str
    confidence: float
    confidence_reasoning: str
    memo: str
    partial_accuracy: str
    six_digit_match: str
    sources: List[str] = []
    validation_warning: Optional[str] = None


# Path to EU TARIC PDF (adjust as needed)
TARIC_PDF_PATH = os.path.join(os.path.dirname(__file__), "EU TARIC PDF.pdf")


def build_product_data(req: ClassificationRequest) -> str:
    """Build product data string from request fields."""
    parts = [f"Product Description: {req.product_description}"]
    
    if req.cas_numbers:
        parts.append(f"CAS Numbers: {', '.join(req.cas_numbers)}")
    if req.active_ingredients:
        parts.append(f"Active Ingredients: {', '.join(req.active_ingredients)}")
    if req.chemical_composition:
        parts.append(f"Chemical Composition: {', '.join(req.chemical_composition)}")
    if req.safety_warnings:
        parts.append(f"Safety Warnings: {', '.join(req.safety_warnings)}")
    if req.formulation:
        parts.append(f"Formulation: {', '.join(req.formulation)}")
    if req.packaging:
        parts.append(f"Packaging: {', '.join(req.packaging)}")
    if req.therapeutic_use:
        parts.append(f"Therapeutic Use: {', '.join(req.therapeutic_use)}")
    if req.manufacturer:
        parts.append(f"Manufacturer: {req.manufacturer}")
    if req.storage:
        parts.append(f"Storage: {req.storage}")
    
    return "\n".join(parts)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "taric_pdf_available": os.path.exists(TARIC_PDF_PATH)}


@app.post("/classify", response_model=ClassificationResponse)
async def classify_product(request: ClassificationRequest):
    """
    Classify a pharmaceutical product and return HS/TARIC code.
    Uses EU TARIC PDF for reference if available.
    """
    try:
        pdf_text = request.extracted_text or ""
        product_data = build_product_data(request)
        
        # Check if TARIC PDF exists
        if os.path.exists(TARIC_PDF_PATH):
            result = runPrompt(pdf_text, product_data, taric_pdf_path=TARIC_PDF_PATH)
        else:
            # Run without TARIC PDF (will use embedded rules in prompt)
            result = runPrompt(pdf_text, product_data, taric_pdf_path=None)
        
        # Build response
        confidence = result.get("confidence", 0.5)
        six_digit_match = (
            "High confidence" if confidence >= 0.85 
            else "Medium confidence" if confidence >= 0.65 
            else "Low confidence - verify"
        )
        
        return ClassificationResponse(
            hs_code=result.get("hs_code", "3004.90.00.00"),
            confidence=confidence,
            confidence_reasoning=result.get("confidence_reasoning", ""),
            memo=result.get("legal_memo", ""),
            partial_accuracy=f"6-digit match: {confidence * 100:.1f}%",
            six_digit_match=six_digit_match,
            sources=result.get("sources", []),
            validation_warning=result.get("validation_warning"),
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/classify-with-pdf")
async def classify_with_pdf(
    product_pdf: UploadFile = File(...),
    product_description: str = Form(""),
):
    """
    Upload a product specification PDF and classify it.
    Extracts text from the PDF and runs classification.
    """
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await product_pdf.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        # Extract text from uploaded PDF
        pdf_text = extract_pdf_text(tmp_path)
        os.unlink(tmp_path)  # Clean up temp file
        
        # Run classification
        if os.path.exists(TARIC_PDF_PATH):
            result = runPrompt(pdf_text, product_description, taric_pdf_path=TARIC_PDF_PATH)
        else:
            result = runPrompt(pdf_text, product_description, taric_pdf_path=None)
        
        confidence = result.get("confidence", 0.5)
        
        return {
            "hs_code": result.get("hs_code", "3004.90.00.00"),
            "confidence": confidence,
            "confidence_reasoning": result.get("confidence_reasoning", ""),
            "memo": result.get("legal_memo", ""),
            "partial_accuracy": f"6-digit match: {confidence * 100:.1f}%",
            "six_digit_match": (
                "High confidence" if confidence >= 0.85 
                else "Medium confidence" if confidence >= 0.65 
                else "Low confidence - verify"
            ),
            "sources": result.get("sources", []),
            "extracted_text": pdf_text[:2000] + "..." if len(pdf_text) > 2000 else pdf_text,
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
