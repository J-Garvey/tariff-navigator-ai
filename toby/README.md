# Easy Ship AI

Pharma HS/TARIC classification: upload a Product Spec Sheet (PDF→text) and get a 10-digit code + Legal Justification Memo.

## Setup

1. **Python 3.9+** and pip.

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **API key:**
   - Copy `.env.example` to `.env`
   - Add your Gemini API key to `.env`:
     ```
     API_KEY=your_actual_gemini_api_key
     ```
   - Get a key at [Google AI Studio](https://aistudio.google.com/apikey).

## Run

**Quick test:**
```bash
python buildPrompt.py
```

**From code:**
```python
from buildPrompt import runPrompt, buildPrompt

pdfText = "..."   # Long text from your PDF spec sheet
productData = "..."  # Short product description

result = runPrompt(pdfText, productData)
print(result)  # 10-digit code + Legal Justification Memo
```

## Files

- `callLLM2.py` – LLM client (Gemini), `callLLM(theContent)`.
- `buildPrompt.py` – Assembles system prompt + PDF text + product data; `buildPrompt()` / `runPrompt()`.
- `requirements.txt` – Python deps.
- `.env.example` – Template for env vars (copy to `.env` and add your key).

## Do not share

- **`.env`** – Contains your API key. Never commit or send it. Only share `.env.example`.
