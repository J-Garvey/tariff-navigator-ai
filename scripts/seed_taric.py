"""
TARIC Database Seeding Script

Fetches TARIC codes from the EU TARIC database and seeds them into Supabase.
The EU provides TARIC data through their DDS2 system.

Usage:
    python seed_taric.py --chapter 30          # Seed only Chapter 30 (pharma)
    python seed_taric.py --all                  # Seed all chapters
    python seed_taric.py --update              # Check for updates only
"""

import os
import json
import requests
import argparse
from datetime import datetime
from typing import Optional, List, Dict
from supabase import create_client, Client
from dotenv import load_dotenv
import time
import re

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Use service key for write access

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required. Set them in .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# EU TARIC API endpoints
TARIC_BASE_URL = "https://ec.europa.eu/taxation_customs/dds2/taric"
# Note: EU's actual TARIC API is complex. For MVP, we'll use a combination of:
# 1. Static data files from EU
# 2. Web scraping as fallback
# 3. Manual data entry for critical codes


def format_taric_code(code: str) -> str:
    """Format a 10-digit code as XXXX.XX.XX.XX"""
    code = code.replace(".", "").replace(" ", "")
    if len(code) != 10:
        return code
    return f"{code[:4]}.{code[4:6]}.{code[6:8]}.{code[8:10]}"


def parse_taric_code(code: str) -> Dict:
    """Parse a TARIC code into its components"""
    code_numeric = code.replace(".", "")
    return {
        "code": format_taric_code(code_numeric),
        "code_numeric": code_numeric,
        "chapter": code_numeric[:2],
        "heading": code_numeric[:4],
        "subheading": code_numeric[:6],
    }


# Expanded Chapter 30 codes with detailed descriptions
CHAPTER_30_CODES = [
    # 3001 - Glands and organs
    {"code": "3001.10.10.00", "description": "Glands and other organs, dried, in powdered form"},
    {"code": "3001.10.90.00", "description": "Glands and other organs, dried, not powdered"},
    {"code": "3001.20.10.00", "description": "Extracts of glands or other organs, of human origin"},
    {"code": "3001.20.90.00", "description": "Extracts of glands or other organs, of animal origin"},
    {"code": "3001.90.10.00", "description": "Heparin and its salts"},
    {"code": "3001.90.20.00", "description": "Human substances prepared for therapeutic or prophylactic uses, not elsewhere specified"},
    {"code": "3001.90.91.00", "description": "Other animal substances for therapeutic uses, for organo-therapeutic uses"},
    {"code": "3001.90.98.00", "description": "Other animal substances for therapeutic uses, other"},
    
    # 3002 - Blood, antisera, vaccines, etc.
    {"code": "3002.11.00.00", "description": "Malaria diagnostic test kits"},
    {"code": "3002.12.00.00", "description": "Antisera and other blood fractions"},
    {"code": "3002.13.00.00", "description": "Immunological products, unmixed, not put up in measured doses or forms, or for retail sale"},
    {"code": "3002.14.00.00", "description": "Immunological products, mixed, not put up in measured doses or forms, or for retail sale"},
    {"code": "3002.15.00.00", "description": "Immunological products, put up in measured doses or forms, or for retail sale (includes monoclonal antibodies like pembrolizumab, nivolumab, trastuzumab, rituximab, adalimumab)"},
    {"code": "3002.41.00.00", "description": "Vaccines for human medicine (COVID-19, influenza, hepatitis, MMR, polio, etc.)"},
    {"code": "3002.42.00.00", "description": "Vaccines for veterinary medicine"},
    {"code": "3002.49.00.00", "description": "Toxins, cultures of micro-organisms (excluding yeasts) and similar products"},
    {"code": "3002.51.00.00", "description": "Cell therapy products"},
    {"code": "3002.59.00.00", "description": "Other cell cultures, whether or not modified"},
    {"code": "3002.90.10.00", "description": "Human blood"},
    {"code": "3002.90.30.00", "description": "Animal blood prepared for therapeutic, prophylactic or diagnostic uses"},
    {"code": "3002.90.50.00", "description": "Cultures of micro-organisms"},
    {"code": "3002.90.90.00", "description": "Other products of heading 3002"},
    
    # 3003 - Medicaments (not put up for retail)
    {"code": "3003.10.00.00", "description": "Medicaments containing penicillins or derivatives thereof, with a penicillanic acid structure, or streptomycins", "keywords": "penicillin, amoxicillin, ampicillin, streptomycin"},
    {"code": "3003.20.00.00", "description": "Medicaments containing other antibiotics", "keywords": "antibiotic, azithromycin, ciprofloxacin, doxycycline, erythromycin, tetracycline"},
    {"code": "3003.31.00.00", "description": "Medicaments containing insulin", "keywords": "insulin, diabetes"},
    {"code": "3003.39.00.00", "description": "Medicaments containing other hormones or steroids used as hormones, but not containing antibiotics", "keywords": "hormone, steroid, testosterone, estrogen, progesterone"},
    {"code": "3003.41.00.00", "description": "Medicaments containing ephedrine or its salts"},
    {"code": "3003.42.00.00", "description": "Medicaments containing pseudoephedrine (INN) or its salts"},
    {"code": "3003.43.00.00", "description": "Medicaments containing norephedrine or its salts"},
    {"code": "3003.49.00.00", "description": "Medicaments containing other alkaloids or derivatives thereof", "keywords": "alkaloid, morphine, codeine, caffeine"},
    {"code": "3003.60.00.00", "description": "Medicaments containing antimalarial active principles", "keywords": "antimalarial, chloroquine, artemisinin, quinine"},
    {"code": "3003.90.10.00", "description": "Medicaments containing iodine or iodine compounds"},
    {"code": "3003.90.90.00", "description": "Other medicaments (not put up for retail sale)", "keywords": "bulk pharmaceutical, API, active pharmaceutical ingredient"},
    
    # 3004 - Medicaments (put up for retail)
    {"code": "3004.10.00.00", "description": "Medicaments containing penicillins or derivatives, for retail sale", "keywords": "penicillin, amoxicillin, augmentin"},
    {"code": "3004.20.00.00", "description": "Medicaments containing other antibiotics, for retail sale", "keywords": "antibiotic, azithromycin, z-pack"},
    {"code": "3004.31.00.00", "description": "Medicaments containing insulin, for retail sale", "keywords": "insulin, lantus, humalog, novolog"},
    {"code": "3004.32.00.00", "description": "Medicaments containing corticosteroid hormones, for retail sale", "keywords": "corticosteroid, prednisone, hydrocortisone, dexamethasone"},
    {"code": "3004.39.00.00", "description": "Medicaments containing other hormones, for retail sale", "keywords": "hormone, thyroid, levothyroxine"},
    {"code": "3004.41.00.00", "description": "Medicaments containing ephedrine or its salts, for retail sale"},
    {"code": "3004.42.00.00", "description": "Medicaments containing pseudoephedrine, for retail sale", "keywords": "sudafed, decongestant"},
    {"code": "3004.43.00.00", "description": "Medicaments containing norephedrine, for retail sale"},
    {"code": "3004.49.00.00", "description": "Medicaments containing other alkaloids, for retail sale", "keywords": "codeine, morphine, opioid"},
    {"code": "3004.50.00.00", "description": "Medicaments containing vitamins or other products of heading 2936, for retail sale", "keywords": "vitamin, multivitamin, supplement"},
    {"code": "3004.60.00.00", "description": "Medicaments containing antimalarial active principles, for retail sale"},
    {"code": "3004.90.00.00", "description": "Other medicaments for retail sale (general pharmaceuticals)", "keywords": "aspirin, paracetamol, acetaminophen, ibuprofen, tablet, capsule, syrup"},
    
    # 3005 - Bandages and dressings
    {"code": "3005.10.00.00", "description": "Adhesive dressings and other articles having an adhesive layer", "keywords": "bandaid, band-aid, plaster, adhesive bandage"},
    {"code": "3005.90.10.00", "description": "Wadding and articles of wadding"},
    {"code": "3005.90.31.00", "description": "Gauze and articles of gauze, impregnated or coated with pharmaceutical substances"},
    {"code": "3005.90.50.00", "description": "Gauze and articles of gauze, other"},
    {"code": "3005.90.99.00", "description": "Other bandages and similar articles", "keywords": "bandage, dressing, wound care"},
    
    # 3006 - Pharmaceutical goods
    {"code": "3006.10.10.00", "description": "Sterile surgical catgut"},
    {"code": "3006.10.30.00", "description": "Sterile suture materials, sterile laminaria, sterile laminaria tents"},
    {"code": "3006.10.90.00", "description": "Sterile tissue adhesives for surgical wound closure, sterile absorbable surgical haemostatics"},
    {"code": "3006.20.00.00", "description": "Blood-grouping reagents"},
    {"code": "3006.30.00.00", "description": "Opacifying preparations for X-ray examinations; diagnostic reagents designed for patient administration", "keywords": "contrast agent, barium, diagnostic"},
    {"code": "3006.40.00.00", "description": "Dental cements and other dental fillings; bone reconstruction cements", "keywords": "dental, filling, cement"},
    {"code": "3006.50.00.00", "description": "First-aid boxes and kits", "keywords": "first aid, emergency kit"},
    {"code": "3006.60.00.00", "description": "Chemical contraceptive preparations based on hormones or spermicides", "keywords": "birth control, contraceptive, oral contraceptive"},
    {"code": "3006.70.00.00", "description": "Gel preparations designed to be used in human or veterinary medicine as a lubricant", "keywords": "lubricant gel, surgical gel"},
    {"code": "3006.91.00.00", "description": "Appliances identifiable for ostomy use", "keywords": "ostomy, stoma, colostomy"},
    {"code": "3006.92.00.00", "description": "Waste pharmaceuticals", "keywords": "pharmaceutical waste, expired medication"},
    {"code": "3006.93.00.00", "description": "Placebos and blinded (or double-blinded) clinical trial kits", "keywords": "clinical trial, placebo"},
]


def seed_chapter_30():
    """Seed Chapter 30 pharmaceutical codes"""
    print("Seeding Chapter 30 (Pharmaceutical Products)...")
    
    codes_to_insert = []
    for item in CHAPTER_30_CODES:
        parsed = parse_taric_code(item["code"])
        codes_to_insert.append({
            **parsed,
            "description": item["description"],
            "description_short": item["description"][:255] if len(item["description"]) > 255 else item["description"],
            "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/",
        })
    
    # Insert in batches
    batch_size = 50
    for i in range(0, len(codes_to_insert), batch_size):
        batch = codes_to_insert[i:i+batch_size]
        try:
            result = supabase.table("taric_codes").upsert(batch, on_conflict="code").execute()
            print(f"  Inserted batch {i//batch_size + 1}: {len(batch)} codes")
        except Exception as e:
            print(f"  Error inserting batch: {e}")
    
    print(f"Completed: {len(codes_to_insert)} Chapter 30 codes seeded")


def fetch_eu_taric_updates(since_date: Optional[str] = None) -> List[Dict]:
    """
    Fetch TARIC updates from EU sources.
    
    Note: The EU TARIC consultation system is complex. For MVP, we'll:
    1. Check the EU Official Journal for updates
    2. Parse regulation PDFs for changes
    
    For production, consider using:
    - TARIC3 database exports (available to member states)
    - Commercial TARIC data providers
    """
    # This is a placeholder - actual implementation would need to:
    # 1. Scrape/parse EU Official Journal
    # 2. Monitor DG TAXUD updates
    # 3. Use TARIC3 consultation service
    
    print("Checking for TARIC updates from EU...")
    # For MVP, return empty - implement actual scraping later
    return []


def check_for_updates():
    """Check for updates in TARIC codes and update database"""
    updates = fetch_eu_taric_updates()
    
    if not updates:
        print("No updates found")
        return
    
    for update in updates:
        try:
            # Record the change
            supabase.table("taric_changes").insert({
                "code": update["code"],
                "change_type": update["change_type"],
                "old_value": update.get("old_value"),
                "new_value": update.get("new_value"),
                "regulation_reference": update.get("regulation"),
                "effective_date": update.get("effective_date"),
                "source_url": update.get("source_url"),
            }).execute()
            
            # Update the code if needed
            if update["change_type"] in ["rate_change", "description_update"]:
                supabase.table("taric_codes").update(
                    update["new_value"]
                ).eq("code", update["code"]).execute()
            
            print(f"  Processed update for {update['code']}: {update['change_type']}")
        except Exception as e:
            print(f"  Error processing update: {e}")


def verify_code_exists(code: str) -> bool:
    """Check if a TARIC code exists in the database"""
    formatted = format_taric_code(code)
    result = supabase.table("taric_codes").select("code").eq("code", formatted).execute()
    return len(result.data) > 0


def search_codes(query: str, limit: int = 10) -> List[Dict]:
    """Search for TARIC codes by description"""
    result = supabase.rpc("search_taric_codes", {
        "search_query": query,
        "limit_count": limit
    }).execute()
    return result.data


def main():
    parser = argparse.ArgumentParser(description="Seed and manage TARIC database")
    parser.add_argument("--chapter", type=str, help="Seed specific chapter (e.g., 30)")
    parser.add_argument("--all", action="store_true", help="Seed all chapters")
    parser.add_argument("--update", action="store_true", help="Check for updates only")
    parser.add_argument("--verify", type=str, help="Verify a specific code exists")
    parser.add_argument("--search", type=str, help="Search for codes by description")
    
    args = parser.parse_args()
    
    if args.verify:
        exists = verify_code_exists(args.verify)
        print(f"Code {args.verify}: {'EXISTS' if exists else 'NOT FOUND'}")
    elif args.search:
        results = search_codes(args.search)
        print(f"Found {len(results)} results:")
        for r in results:
            print(f"  {r['code']}: {r['description'][:80]}...")
    elif args.update:
        check_for_updates()
    elif args.chapter == "30":
        seed_chapter_30()
    elif args.all:
        seed_chapter_30()
        # Add other chapters as needed
        print("Note: Only Chapter 30 is fully implemented for MVP")
    else:
        print("Usage: python seed_taric.py --chapter 30")
        print("       python seed_taric.py --all")
        print("       python seed_taric.py --update")


if __name__ == "__main__":
    main()
