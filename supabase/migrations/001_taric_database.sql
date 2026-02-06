-- TARIC Database Schema for Easy Ship AI
-- This stores all EU TARIC codes with descriptions, rules, and metadata
-- Enable pg_trgm for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Enable vector extension for semantic search (RAG)
CREATE EXTENSION IF NOT EXISTS vector;
-- Main TARIC codes table
CREATE TABLE IF NOT EXISTS taric_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Code structure (10-digit): XXXX.XX.XX.XX
    code VARCHAR(15) NOT NULL UNIQUE,
    -- Full 10-digit code with dots
    code_numeric VARCHAR(10) NOT NULL,
    -- Without dots for indexing
    -- Hierarchy
    chapter VARCHAR(2) NOT NULL,
    -- First 2 digits (e.g., "30")
    heading VARCHAR(4) NOT NULL,
    -- First 4 digits (e.g., "3004")
    subheading VARCHAR(6) NOT NULL,
    -- First 6 digits (e.g., "300490")
    -- Descriptions
    description TEXT NOT NULL,
    -- Official EU description
    description_short VARCHAR(255),
    -- Short summary
    -- Additional metadata
    unit_of_measure VARCHAR(50),
    -- e.g., "kg", "pieces"
    supplementary_unit VARCHAR(50),
    -- Duty rates (can be complex, stored as JSON)
    duty_rate JSONB DEFAULT '{}',
    -- {"erga_omnes": "0%", "preferential": {...}}
    -- Classification rules
    chapter_notes TEXT,
    -- Relevant chapter notes
    section_notes TEXT,
    -- Relevant section notes
    -- For semantic search (vector embeddings)
    description_embedding vector(1536),
    -- OpenAI embedding dimension
    -- Source tracking
    source_url TEXT,
    -- Link to official TARIC source
    regulation_reference TEXT,
    -- EU regulation reference
    -- Timestamps
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Indexes for fast lookup
    CONSTRAINT valid_code_format CHECK (code ~ '^\d{4}\.\d{2}\.\d{2}\.\d{2}$')
);
-- Chapter metadata table
CREATE TABLE IF NOT EXISTS taric_chapters (
    chapter VARCHAR(2) PRIMARY KEY,
    title TEXT NOT NULL,
    section VARCHAR(4),
    -- Roman numeral section
    section_title TEXT,
    notes TEXT,
    -- Full chapter notes
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Tariff change history for monitoring
CREATE TABLE IF NOT EXISTS taric_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(15) NOT NULL REFERENCES taric_codes(code) ON DELETE CASCADE,
    change_type VARCHAR(20) NOT NULL,
    -- 'rate_change', 'new_code', 'deprecated', 'description_update'
    old_value JSONB,
    new_value JSONB,
    regulation_reference TEXT,
    effective_date DATE,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    source_url TEXT,
    processed BOOLEAN DEFAULT FALSE
);
-- News/alerts table for the scraper
CREATE TABLE IF NOT EXISTS taric_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    summary TEXT,
    source_url TEXT NOT NULL,
    source_name VARCHAR(100),
    published_at TIMESTAMPTZ,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    -- Extracted info
    affected_codes TEXT [],
    -- Array of affected TARIC codes
    change_type VARCHAR(50),
    -- 'duty_increase', 'duty_decrease', 'new_regulation', etc.
    effective_date DATE,
    -- Processing status
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ
);
-- User classification history (for auditing)
CREATE TABLE IF NOT EXISTS classification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Input
    product_description TEXT NOT NULL,
    extracted_data JSONB,
    -- From PDF extraction
    -- Result
    classified_code VARCHAR(15) REFERENCES taric_codes(code),
    confidence DECIMAL(3, 2),
    reasoning TEXT,
    legal_memo TEXT,
    sources TEXT [],
    -- Follow-up conversation
    conversation_history JSONB DEFAULT '[]',
    -- Array of {role, content}
    -- Metadata
    user_id UUID,
    -- If you add auth later
    session_id UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_taric_codes_chapter ON taric_codes(chapter);
CREATE INDEX IF NOT EXISTS idx_taric_codes_heading ON taric_codes(heading);
CREATE INDEX IF NOT EXISTS idx_taric_codes_subheading ON taric_codes(subheading);
CREATE INDEX IF NOT EXISTS idx_taric_codes_code_numeric ON taric_codes(code_numeric);
CREATE INDEX IF NOT EXISTS idx_taric_codes_description_trgm ON taric_codes USING gin(description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_taric_codes_embedding ON taric_codes USING ivfflat (description_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_taric_changes_code ON taric_changes(code);
CREATE INDEX IF NOT EXISTS idx_taric_changes_date ON taric_changes(detected_at);
CREATE INDEX IF NOT EXISTS idx_taric_news_scraped ON taric_news(scraped_at);
CREATE INDEX IF NOT EXISTS idx_taric_news_affected ON taric_news USING gin(affected_codes);
CREATE INDEX IF NOT EXISTS idx_classification_history_session ON classification_history(session_id);
CREATE INDEX IF NOT EXISTS idx_classification_history_code ON classification_history(classified_code);
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER taric_codes_updated_at BEFORE
UPDATE ON taric_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- Function to search TARIC codes by text (fuzzy + semantic)
CREATE OR REPLACE FUNCTION search_taric_codes(
        search_query TEXT,
        query_embedding vector(1536) DEFAULT NULL,
        limit_count INT DEFAULT 10
    ) RETURNS TABLE (
        code VARCHAR(15),
        description TEXT,
        chapter VARCHAR(2),
        heading VARCHAR(4),
        similarity FLOAT,
        match_type TEXT
    ) AS $$ BEGIN -- If embedding provided, do semantic search
    IF query_embedding IS NOT NULL THEN RETURN QUERY
SELECT tc.code,
    tc.description,
    tc.chapter,
    tc.heading,
    1 - (tc.description_embedding <=> query_embedding) as similarity,
    'semantic'::TEXT as match_type
FROM taric_codes tc
WHERE tc.description_embedding IS NOT NULL
ORDER BY tc.description_embedding <=> query_embedding
LIMIT limit_count;
ELSE -- Fallback to fuzzy text search
RETURN QUERY
SELECT tc.code,
    tc.description,
    tc.chapter,
    tc.heading,
    similarity(tc.description, search_query) as similarity,
    'fuzzy'::TEXT as match_type
FROM taric_codes tc
WHERE tc.description % search_query
    OR tc.description ILIKE '%' || search_query || '%'
ORDER BY similarity(tc.description, search_query) DESC
LIMIT limit_count;
END IF;
END;
$$ LANGUAGE plpgsql;
-- Seed Chapter 30 data (pharmaceuticals) - you'll expand this
INSERT INTO taric_chapters (chapter, title, section, section_title, notes)
VALUES (
        '30',
        'Pharmaceutical products',
        'VI',
        'Products of the Chemical or Allied Industries',
        '1. This chapter does not cover:
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
- 3004: Medicaments put up in measured doses or retail packing'
    ) ON CONFLICT (chapter) DO NOTHING;
-- Seed some Chapter 30 TARIC codes (you'll add the full dataset)
INSERT INTO taric_codes (
        code,
        code_numeric,
        chapter,
        heading,
        subheading,
        description,
        description_short,
        source_url
    )
VALUES (
        '3001.10.00.00',
        '3001100000',
        '30',
        '3001',
        '300110',
        'Glands and other organs for organo-therapeutic uses, dried, whether or not powdered',
        'Dried glands/organs for organo-therapy',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3001.20.00.00',
        '3001200000',
        '30',
        '3001',
        '300120',
        'Extracts of glands or other organs or of their secretions',
        'Gland/organ extracts',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3001.90.00.00',
        '3001900000',
        '30',
        '3001',
        '300190',
        'Other glands and organs; heparin and its salts; other human or animal substances',
        'Other glands/organs, heparin',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3002.12.00.00',
        '3002120000',
        '30',
        '3002',
        '300212',
        'Antisera and other blood fractions',
        'Antisera and blood fractions',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3002.13.00.00',
        '3002130000',
        '30',
        '3002',
        '300213',
        'Immunological products, unmixed, not put up in measured doses or for retail sale',
        'Unmixed immunological products (bulk)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3002.14.00.00',
        '3002140000',
        '30',
        '3002',
        '300214',
        'Immunological products, mixed, not put up in measured doses or for retail sale',
        'Mixed immunological products (bulk)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3002.15.00.00',
        '3002150000',
        '30',
        '3002',
        '300215',
        'Immunological products, put up in measured doses or for retail sale',
        'Immunological products (retail) - includes monoclonal antibodies',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3002.41.00.00',
        '3002410000',
        '30',
        '3002',
        '300241',
        'Vaccines for human medicine',
        'Human vaccines',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3002.42.00.00',
        '3002420000',
        '30',
        '3002',
        '300242',
        'Vaccines for veterinary medicine',
        'Veterinary vaccines',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3002.49.00.00',
        '3002490000',
        '30',
        '3002',
        '300249',
        'Toxins, cultures of micro-organisms and similar products',
        'Toxins and cultures',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3002.90.00.00',
        '3002900000',
        '30',
        '3002',
        '300290',
        'Human blood; animal blood for therapeutic uses; other',
        'Blood and other (heading 3002)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3003.10.00.00',
        '3003100000',
        '30',
        '3003',
        '300310',
        'Medicaments containing penicillins or derivatives, not retail',
        'Penicillins (bulk)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3003.20.00.00',
        '3003200000',
        '30',
        '3003',
        '300320',
        'Medicaments containing other antibiotics, not retail',
        'Other antibiotics (bulk)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3003.31.00.00',
        '3003310000',
        '30',
        '3003',
        '300331',
        'Medicaments containing insulin, not retail',
        'Insulin (bulk)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3003.39.00.00',
        '3003390000',
        '30',
        '3003',
        '300339',
        'Medicaments containing other hormones, not retail',
        'Other hormones (bulk)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3003.41.00.00',
        '3003410000',
        '30',
        '3003',
        '300341',
        'Medicaments containing ephedrine or its salts, not retail',
        'Ephedrine (bulk)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3003.42.00.00',
        '3003420000',
        '30',
        '3003',
        '300342',
        'Medicaments containing pseudoephedrine, not retail',
        'Pseudoephedrine (bulk)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3003.43.00.00',
        '3003430000',
        '30',
        '3003',
        '300343',
        'Medicaments containing norephedrine, not retail',
        'Norephedrine (bulk)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3003.49.00.00',
        '3003490000',
        '30',
        '3003',
        '300349',
        'Medicaments containing other alkaloids, not retail',
        'Other alkaloids (bulk)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3003.60.00.00',
        '3003600000',
        '30',
        '3003',
        '300360',
        'Medicaments containing antimalarial principles, not retail',
        'Antimalarials (bulk)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3003.90.00.00',
        '3003900000',
        '30',
        '3003',
        '300390',
        'Other medicaments, not retail',
        'Other medicaments (bulk)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3004.10.00.00',
        '3004100000',
        '30',
        '3004',
        '300410',
        'Medicaments containing penicillins or derivatives, for retail',
        'Penicillins (retail)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3004.20.00.00',
        '3004200000',
        '30',
        '3004',
        '300420',
        'Medicaments containing other antibiotics, for retail',
        'Other antibiotics (retail)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3004.31.00.00',
        '3004310000',
        '30',
        '3004',
        '300431',
        'Medicaments containing insulin, for retail',
        'Insulin (retail)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3004.32.00.00',
        '3004320000',
        '30',
        '3004',
        '300432',
        'Medicaments containing corticosteroid hormones, for retail',
        'Corticosteroids (retail)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3004.39.00.00',
        '3004390000',
        '30',
        '3004',
        '300439',
        'Medicaments containing other hormones, for retail',
        'Other hormones (retail)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3004.41.00.00',
        '3004410000',
        '30',
        '3004',
        '300441',
        'Medicaments containing ephedrine or its salts, for retail',
        'Ephedrine (retail)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3004.42.00.00',
        '3004420000',
        '30',
        '3004',
        '300442',
        'Medicaments containing pseudoephedrine, for retail',
        'Pseudoephedrine (retail)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3004.43.00.00',
        '3004430000',
        '30',
        '3004',
        '300443',
        'Medicaments containing norephedrine, for retail',
        'Norephedrine (retail)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3004.49.00.00',
        '3004490000',
        '30',
        '3004',
        '300449',
        'Medicaments containing other alkaloids, for retail',
        'Other alkaloids (retail)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3004.50.00.00',
        '3004500000',
        '30',
        '3004',
        '300450',
        'Medicaments containing vitamins, for retail',
        'Vitamins (retail)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3004.60.00.00',
        '3004600000',
        '30',
        '3004',
        '300460',
        'Medicaments containing antimalarial principles, for retail',
        'Antimalarials (retail)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3004.90.00.00',
        '3004900000',
        '30',
        '3004',
        '300490',
        'Other medicaments, for retail',
        'Other medicaments (retail)',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3005.10.00.00',
        '3005100000',
        '30',
        '3005',
        '300510',
        'Adhesive dressings and other articles having an adhesive layer',
        'Adhesive dressings',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3005.90.00.00',
        '3005900000',
        '30',
        '3005',
        '300590',
        'Wadding, gauze, bandages and similar articles, other',
        'Other bandages/dressings',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3006.10.00.00',
        '3006100000',
        '30',
        '3006',
        '300610',
        'Sterile surgical catgut; sterile suture materials; sterile tissue adhesives',
        'Surgical sutures',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3006.20.00.00',
        '3006200000',
        '30',
        '3006',
        '300620',
        'Blood-grouping reagents',
        'Blood-grouping reagents',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3006.30.00.00',
        '3006300000',
        '30',
        '3006',
        '300630',
        'Opacifying preparations for X-ray examinations; diagnostic reagents',
        'X-ray contrast and diagnostics',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3006.40.00.00',
        '3006400000',
        '30',
        '3006',
        '300640',
        'Dental cements and other dental fillings; bone reconstruction cements',
        'Dental cements',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3006.50.00.00',
        '3006500000',
        '30',
        '3006',
        '300650',
        'First-aid boxes and kits',
        'First-aid kits',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3006.60.00.00',
        '3006600000',
        '30',
        '3006',
        '300660',
        'Chemical contraceptive preparations based on hormones',
        'Hormonal contraceptives',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3006.70.00.00',
        '3006700000',
        '30',
        '3006',
        '300670',
        'Gel preparations for use in human or veterinary medicine as lubricant',
        'Medical lubricant gels',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3006.91.00.00',
        '3006910000',
        '30',
        '3006',
        '300691',
        'Appliances identifiable for ostomy use',
        'Ostomy appliances',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ),
    (
        '3006.92.00.00',
        '3006920000',
        '30',
        '3006',
        '300692',
        'Waste pharmaceuticals',
        'Pharmaceutical waste',
        'https://ec.europa.eu/taxation_customs/dds2/taric/'
    ) ON CONFLICT (code) DO NOTHING;
-- Grant access to authenticated and anon users (for Supabase)
GRANT SELECT ON taric_codes TO anon,
    authenticated;
GRANT SELECT ON taric_chapters TO anon,
    authenticated;
GRANT SELECT,
    INSERT ON classification_history TO anon,
    authenticated;
GRANT SELECT ON taric_changes TO anon,
    authenticated;
GRANT SELECT ON taric_news TO anon,
    authenticated;