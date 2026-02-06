# Easy Ship AI

AI-powered pharmaceutical HS/TARIC code classification with audit-ready legal memos - grounded in a real TARIC database.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User uploads   │────▶│  AI searches     │────▶│  Returns codes  │
│  product specs  │     │  TARIC database  │     │  + reasoning +  │
│  (PDF/text)     │     │  (Supabase)      │     │  source links   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                  ┌─────────────────┐
                                                  │  User asks      │
                                                  │  follow-up Qs   │
                                                  │  (TARIC-only)   │
                                                  └─────────────────┘

┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  News scraper   │────▶│  Detect tariff   │────▶│  Update local   │
│  monitors EU    │     │  changes         │     │  TARIC database │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Features

- 📄 **PDF Upload**: Extract product data from specification sheets
- 🗄️ **TARIC Database**: Real database of TARIC codes (not hallucinated)
- 🤖 **AI Classification**: LLM grounded in database for accurate codes
- 🔗 **Source Links**: Every classification links to official TARIC sources
- 💬 **Follow-up Chat**: Ask questions (AI constrained to TARIC knowledge)
- 📰 **News Scraper**: Monitors EU for tariff changes
- 🔄 **Auto-update**: Compares & updates codes when changes detected
- ✅ **Database Validation**: AI output verified against real codes

## Quick Start

### 1. Frontend (React + Vite)

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

### 2. Database Setup (Supabase)

```bash
# Login to Supabase CLI
npx supabase login

# Link to your project
npx supabase link --project-ref evtegpxyxjtdlfeujwil

# Run migrations to create TARIC tables
npx supabase db push

# Or run the migration SQL directly in Supabase Dashboard
# Copy contents of: supabase/migrations/001_taric_database.sql
```

### 3. Seed TARIC Data

```bash
cd scripts
pip install -r requirements.txt

# Add your Supabase service key to .env:
# SUPABASE_URL=https://evtegpxyxjtdlfeujwil.supabase.co
# SUPABASE_SERVICE_KEY=your_service_role_key

python seed_taric.py --chapter 30    # Seed pharmaceutical codes
```

### 4. Deploy Edge Functions

```bash
# Set secrets
npx supabase secrets set LOVABLE_API_KEY=your_lovable_api_key

# Deploy classification function (v2 with database)
npx supabase functions deploy classify-product-v2

# Deploy news scraper
npx supabase functions deploy tariff-scraper
```

### 5. Configure Environment

Create `.env` in root:

```env
VITE_SUPABASE_URL=https://evtegpxyxjtdlfeujwil.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

## Project Structure

```
├── src/                      # React frontend
│   ├── components/           # UI components
│   ├── lib/
│   │   ├── api.ts           # API calls + follow-up chat
│   │   └── pdfParser.ts     # PDF text extraction
│   └── pages/
│       └── Index.tsx        # Main app page
│
├── supabase/
│   ├── migrations/
│   │   └── 001_taric_database.sql  # Database schema
│   └── functions/
│       ├── classify-product-v2/    # AI classification with DB
│       └── tariff-scraper/         # News scraper
│
├── scripts/
│   └── seed_taric.py        # Seed TARIC codes into DB
│
└── toby/                     # Python backend (alternative)
```

## Database Schema

### `taric_codes`

Stores all TARIC codes with descriptions, duty rates, and source links.

### `taric_chapters`

Chapter metadata and notes (e.g., Chapter 30 pharmaceutical rules).

### `taric_changes`

Tracks changes detected by the news scraper.

### `taric_news`

News articles about tariff changes.

### `classification_history`

User classification history for follow-up chats.

## API Endpoints

### Classify Product

```
POST /functions/v1/classify-product-v2
{
  "product_description": "Pembrolizumab 10ml vial",
  "extracted_text": "...",
  "active_ingredients": ["pembrolizumab"],
  ...
}
```

### Follow-up Question

```
POST /functions/v1/classify-product-v2
{
  "session_id": "...",
  "follow_up_question": "Why not 3002.13?",
  "conversation_history": [...]
}
```

### Scrape Tariff News

```
GET /functions/v1/tariff-scraper?action=full
```

## News Scraper

The scraper monitors:

- **DG TAXUD News**: EU customs news
- **EUR-Lex**: Official Journal regulations

Run it manually or set up a cron job:

```bash
# Manual run
curl "https://your-project.supabase.co/functions/v1/tariff-scraper?action=full"

# Cron (every 6 hours) - use Supabase Edge Functions cron or external service
```

## MVP Checklist

- [x] PDF upload & extraction
- [x] TARIC database schema
- [x] AI classification with database grounding
- [x] Source link generation
- [x] Follow-up chat (TARIC-constrained)
- [x] News scraper service
- [x] Change detection & tracking
- [ ] Seed full TARIC database (currently Chapter 30 subset)
- [ ] Set up cron for scraper
- [ ] Add user authentication
- [ ] Add usage analytics

## Preventing AI Hallucination

The AI is grounded in the database through:

1. **Context Injection**: AI only sees codes from our database
2. **Validation**: AI output is verified against `taric_codes` table
3. **Constraint Prompt**: System prompt restricts AI to TARIC-only answers
4. **Fallback**: If AI returns unknown code, closest match is suggested

## Technologies

- **Frontend**: Vite, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: Supabase (PostgreSQL + pgvector for semantic search)
- **AI**: Google Gemini via Lovable AI Gateway
- **PDF**: pdf.js for client-side extraction

## License

Private - All rights reserved

````

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Setting up the LLM Backend

This project uses Supabase Edge Functions to process classification requests with AI.

### Option 1: Using Supabase (Production)

1. Set up the `LOVABLE_API_KEY` secret in your Supabase project:

   ```bash
   npx supabase secrets set LOVABLE_API_KEY=your_lovable_api_key_here
````

2. Deploy the edge function:
   ```bash
   npx supabase functions deploy classify-product
   ```

### Option 2: Local Development with Mock Data

The app automatically falls back to mock data when the backend is not available. This allows you to test the UI without setting up the full backend.

### Option 3: Direct Python Integration (Alternative)

You can also use the Python scripts in the `/toby` folder:

1. Copy `toby/.env.example` to `toby/.env`
2. Add your Google Gemini API key: `API_KEY=your_gemini_api_key`
3. Run: `python toby/buildPrompt.py`
