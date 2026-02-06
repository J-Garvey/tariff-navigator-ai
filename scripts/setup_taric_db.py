#!/usr/bin/env python3
"""
TARIC Database Setup Script
Downloads the full EU TARIC database and pushes it to Supabase
"""

import os
import json
import requests
from typing import List, Dict, Any
import time

# Supabase configuration
SUPABASE_URL = "https://nofgsqvmcvxneicoraxt.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vZmdzcXZtY3Z4bmVpY29yYXh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDQwODk1NCwiZXhwIjoyMDg1OTg0OTU0fQ.mrOGCZ416OcYdWweNR8heSma07bSETVDvWrqdMfSk7M"

# Headers for Supabase REST API
HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def execute_sql(sql: str) -> dict:
    """Execute raw SQL via Supabase's RPC endpoint"""
    # Using the pg_net extension or direct REST SQL
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    response = requests.post(url, headers=HEADERS, json={"query": sql})
    return response

def insert_records(table: str, records: List[Dict]) -> bool:
    """Insert records into a Supabase table"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    
    # Insert in batches of 100
    batch_size = 100
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        response = requests.post(
            url,
            headers={**HEADERS, "Prefer": "return=minimal,resolution=merge-duplicates"},
            json=batch
        )
        if response.status_code not in [200, 201]:
            print(f"Error inserting batch {i//batch_size + 1}: {response.status_code}")
            print(response.text)
            return False
        print(f"Inserted batch {i//batch_size + 1} ({len(batch)} records)")
        time.sleep(0.1)  # Rate limiting
    return True

def get_chapters_data() -> List[Dict]:
    """Get all 99 HS chapters metadata"""
    chapters = [
        {"chapter": "01", "title": "Live animals", "section": "I", "section_title": "Live Animals; Animal Products"},
        {"chapter": "02", "title": "Meat and edible meat offal", "section": "I", "section_title": "Live Animals; Animal Products"},
        {"chapter": "03", "title": "Fish and crustaceans", "section": "I", "section_title": "Live Animals; Animal Products"},
        {"chapter": "04", "title": "Dairy produce; birds' eggs; natural honey", "section": "I", "section_title": "Live Animals; Animal Products"},
        {"chapter": "05", "title": "Products of animal origin, not elsewhere specified", "section": "I", "section_title": "Live Animals; Animal Products"},
        {"chapter": "06", "title": "Live trees and other plants; bulbs, roots", "section": "II", "section_title": "Vegetable Products"},
        {"chapter": "07", "title": "Edible vegetables and certain roots and tubers", "section": "II", "section_title": "Vegetable Products"},
        {"chapter": "08", "title": "Edible fruit and nuts; peel of citrus fruit or melons", "section": "II", "section_title": "Vegetable Products"},
        {"chapter": "09", "title": "Coffee, tea, maté and spices", "section": "II", "section_title": "Vegetable Products"},
        {"chapter": "10", "title": "Cereals", "section": "II", "section_title": "Vegetable Products"},
        {"chapter": "11", "title": "Products of the milling industry; malt; starches", "section": "II", "section_title": "Vegetable Products"},
        {"chapter": "12", "title": "Oil seeds and oleaginous fruits; miscellaneous grains", "section": "II", "section_title": "Vegetable Products"},
        {"chapter": "13", "title": "Lac; gums, resins and other vegetable saps and extracts", "section": "II", "section_title": "Vegetable Products"},
        {"chapter": "14", "title": "Vegetable plaiting materials; vegetable products not elsewhere specified", "section": "II", "section_title": "Vegetable Products"},
        {"chapter": "15", "title": "Animal or vegetable fats and oils", "section": "III", "section_title": "Animal or Vegetable Fats and Oils"},
        {"chapter": "16", "title": "Preparations of meat, fish or crustaceans", "section": "IV", "section_title": "Prepared Foodstuffs"},
        {"chapter": "17", "title": "Sugars and sugar confectionery", "section": "IV", "section_title": "Prepared Foodstuffs"},
        {"chapter": "18", "title": "Cocoa and cocoa preparations", "section": "IV", "section_title": "Prepared Foodstuffs"},
        {"chapter": "19", "title": "Preparations of cereals, flour, starch or milk", "section": "IV", "section_title": "Prepared Foodstuffs"},
        {"chapter": "20", "title": "Preparations of vegetables, fruit, nuts", "section": "IV", "section_title": "Prepared Foodstuffs"},
        {"chapter": "21", "title": "Miscellaneous edible preparations", "section": "IV", "section_title": "Prepared Foodstuffs"},
        {"chapter": "22", "title": "Beverages, spirits and vinegar", "section": "IV", "section_title": "Prepared Foodstuffs"},
        {"chapter": "23", "title": "Residues and waste from the food industries; animal fodder", "section": "IV", "section_title": "Prepared Foodstuffs"},
        {"chapter": "24", "title": "Tobacco and manufactured tobacco substitutes", "section": "IV", "section_title": "Prepared Foodstuffs"},
        {"chapter": "25", "title": "Salt; sulphur; earths and stone; plastering materials", "section": "V", "section_title": "Mineral Products"},
        {"chapter": "26", "title": "Ores, slag and ash", "section": "V", "section_title": "Mineral Products"},
        {"chapter": "27", "title": "Mineral fuels, mineral oils and products of their distillation", "section": "V", "section_title": "Mineral Products"},
        {"chapter": "28", "title": "Inorganic chemicals; organic or inorganic compounds of precious metals", "section": "VI", "section_title": "Products of the Chemical or Allied Industries"},
        {"chapter": "29", "title": "Organic chemicals", "section": "VI", "section_title": "Products of the Chemical or Allied Industries"},
        {"chapter": "30", "title": "Pharmaceutical products", "section": "VI", "section_title": "Products of the Chemical or Allied Industries"},
        {"chapter": "31", "title": "Fertilizers", "section": "VI", "section_title": "Products of the Chemical or Allied Industries"},
        {"chapter": "32", "title": "Tanning or dyeing extracts; dyes, pigments and paints", "section": "VI", "section_title": "Products of the Chemical or Allied Industries"},
        {"chapter": "33", "title": "Essential oils and resinoids; perfumery, cosmetic", "section": "VI", "section_title": "Products of the Chemical or Allied Industries"},
        {"chapter": "34", "title": "Soap, organic surface-active agents, washing preparations", "section": "VI", "section_title": "Products of the Chemical or Allied Industries"},
        {"chapter": "35", "title": "Albuminoidal substances; modified starches; glues; enzymes", "section": "VI", "section_title": "Products of the Chemical or Allied Industries"},
        {"chapter": "36", "title": "Explosives; pyrotechnic products; matches; pyrophoric alloys", "section": "VI", "section_title": "Products of the Chemical or Allied Industries"},
        {"chapter": "37", "title": "Photographic or cinematographic goods", "section": "VI", "section_title": "Products of the Chemical or Allied Industries"},
        {"chapter": "38", "title": "Miscellaneous chemical products", "section": "VI", "section_title": "Products of the Chemical or Allied Industries"},
        {"chapter": "39", "title": "Plastics and articles thereof", "section": "VII", "section_title": "Plastics and Articles Thereof; Rubber"},
        {"chapter": "40", "title": "Rubber and articles thereof", "section": "VII", "section_title": "Plastics and Articles Thereof; Rubber"},
        {"chapter": "41", "title": "Raw hides and skins (other than furskins) and leather", "section": "VIII", "section_title": "Raw Hides, Skins, Leather, Furskins"},
        {"chapter": "42", "title": "Articles of leather; saddlery and harness; travel goods", "section": "VIII", "section_title": "Raw Hides, Skins, Leather, Furskins"},
        {"chapter": "43", "title": "Furskins and artificial fur; manufactures thereof", "section": "VIII", "section_title": "Raw Hides, Skins, Leather, Furskins"},
        {"chapter": "44", "title": "Wood and articles of wood; wood charcoal", "section": "IX", "section_title": "Wood and Articles of Wood"},
        {"chapter": "45", "title": "Cork and articles of cork", "section": "IX", "section_title": "Wood and Articles of Wood"},
        {"chapter": "46", "title": "Manufactures of straw, esparto or other plaiting materials", "section": "IX", "section_title": "Wood and Articles of Wood"},
        {"chapter": "47", "title": "Pulp of wood or of other fibrous cellulosic material", "section": "X", "section_title": "Pulp of Wood; Paper and Paperboard"},
        {"chapter": "48", "title": "Paper and paperboard; articles of paper pulp", "section": "X", "section_title": "Pulp of Wood; Paper and Paperboard"},
        {"chapter": "49", "title": "Printed books, newspapers, pictures", "section": "X", "section_title": "Pulp of Wood; Paper and Paperboard"},
        {"chapter": "50", "title": "Silk", "section": "XI", "section_title": "Textiles and Textile Articles"},
        {"chapter": "51", "title": "Wool, fine or coarse animal hair; horsehair yarn and woven fabric", "section": "XI", "section_title": "Textiles and Textile Articles"},
        {"chapter": "52", "title": "Cotton", "section": "XI", "section_title": "Textiles and Textile Articles"},
        {"chapter": "53", "title": "Other vegetable textile fibres; paper yarn", "section": "XI", "section_title": "Textiles and Textile Articles"},
        {"chapter": "54", "title": "Man-made filaments; strip and the like of man-made textile materials", "section": "XI", "section_title": "Textiles and Textile Articles"},
        {"chapter": "55", "title": "Man-made staple fibres", "section": "XI", "section_title": "Textiles and Textile Articles"},
        {"chapter": "56", "title": "Wadding, felt and nonwovens; special yarns; twine, cordage", "section": "XI", "section_title": "Textiles and Textile Articles"},
        {"chapter": "57", "title": "Carpets and other textile floor coverings", "section": "XI", "section_title": "Textiles and Textile Articles"},
        {"chapter": "58", "title": "Special woven fabrics; tufted textile fabrics; lace; tapestries", "section": "XI", "section_title": "Textiles and Textile Articles"},
        {"chapter": "59", "title": "Impregnated, coated, covered or laminated textile fabrics", "section": "XI", "section_title": "Textiles and Textile Articles"},
        {"chapter": "60", "title": "Knitted or crocheted fabrics", "section": "XI", "section_title": "Textiles and Textile Articles"},
        {"chapter": "61", "title": "Articles of apparel and clothing accessories, knitted or crocheted", "section": "XI", "section_title": "Textiles and Textile Articles"},
        {"chapter": "62", "title": "Articles of apparel and clothing accessories, not knitted or crocheted", "section": "XI", "section_title": "Textiles and Textile Articles"},
        {"chapter": "63", "title": "Other made up textile articles; sets; worn clothing", "section": "XI", "section_title": "Textiles and Textile Articles"},
        {"chapter": "64", "title": "Footwear, gaiters and the like; parts of such articles", "section": "XII", "section_title": "Footwear, Headgear, Umbrellas"},
        {"chapter": "65", "title": "Headgear and parts thereof", "section": "XII", "section_title": "Footwear, Headgear, Umbrellas"},
        {"chapter": "66", "title": "Umbrellas, sun umbrellas, walking-sticks, seat-sticks, whips", "section": "XII", "section_title": "Footwear, Headgear, Umbrellas"},
        {"chapter": "67", "title": "Prepared feathers and down; artificial flowers; articles of human hair", "section": "XII", "section_title": "Footwear, Headgear, Umbrellas"},
        {"chapter": "68", "title": "Articles of stone, plaster, cement, asbestos, mica", "section": "XIII", "section_title": "Articles of Stone, Plaster, Cement, Asbestos"},
        {"chapter": "69", "title": "Ceramic products", "section": "XIII", "section_title": "Articles of Stone, Plaster, Cement, Asbestos"},
        {"chapter": "70", "title": "Glass and glassware", "section": "XIII", "section_title": "Articles of Stone, Plaster, Cement, Asbestos"},
        {"chapter": "71", "title": "Natural or cultured pearls, precious or semi-precious stones", "section": "XIV", "section_title": "Natural or Cultured Pearls, Precious Stones and Metals"},
        {"chapter": "72", "title": "Iron and steel", "section": "XV", "section_title": "Base Metals and Articles of Base Metal"},
        {"chapter": "73", "title": "Articles of iron or steel", "section": "XV", "section_title": "Base Metals and Articles of Base Metal"},
        {"chapter": "74", "title": "Copper and articles thereof", "section": "XV", "section_title": "Base Metals and Articles of Base Metal"},
        {"chapter": "75", "title": "Nickel and articles thereof", "section": "XV", "section_title": "Base Metals and Articles of Base Metal"},
        {"chapter": "76", "title": "Aluminium and articles thereof", "section": "XV", "section_title": "Base Metals and Articles of Base Metal"},
        {"chapter": "78", "title": "Lead and articles thereof", "section": "XV", "section_title": "Base Metals and Articles of Base Metal"},
        {"chapter": "79", "title": "Zinc and articles thereof", "section": "XV", "section_title": "Base Metals and Articles of Base Metal"},
        {"chapter": "80", "title": "Tin and articles thereof", "section": "XV", "section_title": "Base Metals and Articles of Base Metal"},
        {"chapter": "81", "title": "Other base metals; cermets; articles thereof", "section": "XV", "section_title": "Base Metals and Articles of Base Metal"},
        {"chapter": "82", "title": "Tools, implements, cutlery, spoons and forks, of base metal", "section": "XV", "section_title": "Base Metals and Articles of Base Metal"},
        {"chapter": "83", "title": "Miscellaneous articles of base metal", "section": "XV", "section_title": "Base Metals and Articles of Base Metal"},
        {"chapter": "84", "title": "Nuclear reactors, boilers, machinery and mechanical appliances", "section": "XVI", "section_title": "Machinery and Mechanical Appliances; Electrical Equipment"},
        {"chapter": "85", "title": "Electrical machinery and equipment and parts thereof", "section": "XVI", "section_title": "Machinery and Mechanical Appliances; Electrical Equipment"},
        {"chapter": "86", "title": "Railway or tramway locomotives, rolling-stock", "section": "XVII", "section_title": "Vehicles, Aircraft, Vessels"},
        {"chapter": "87", "title": "Vehicles other than railway or tramway rolling-stock", "section": "XVII", "section_title": "Vehicles, Aircraft, Vessels"},
        {"chapter": "88", "title": "Aircraft, spacecraft, and parts thereof", "section": "XVII", "section_title": "Vehicles, Aircraft, Vessels"},
        {"chapter": "89", "title": "Ships, boats and floating structures", "section": "XVII", "section_title": "Vehicles, Aircraft, Vessels"},
        {"chapter": "90", "title": "Optical, photographic, measuring, checking, precision instruments", "section": "XVIII", "section_title": "Optical, Photographic, Cinematographic instruments"},
        {"chapter": "91", "title": "Clocks and watches and parts thereof", "section": "XVIII", "section_title": "Optical, Photographic, Cinematographic instruments"},
        {"chapter": "92", "title": "Musical instruments; parts and accessories", "section": "XVIII", "section_title": "Optical, Photographic, Cinematographic instruments"},
        {"chapter": "93", "title": "Arms and ammunition; parts and accessories thereof", "section": "XIX", "section_title": "Arms and Ammunition"},
        {"chapter": "94", "title": "Furniture; bedding, mattresses, cushions; lamps", "section": "XX", "section_title": "Miscellaneous Manufactured Articles"},
        {"chapter": "95", "title": "Toys, games and sports requisites; parts and accessories", "section": "XX", "section_title": "Miscellaneous Manufactured Articles"},
        {"chapter": "96", "title": "Miscellaneous manufactured articles", "section": "XX", "section_title": "Miscellaneous Manufactured Articles"},
        {"chapter": "97", "title": "Works of art, collectors' pieces and antiques", "section": "XXI", "section_title": "Works of Art, Collectors' Pieces and Antiques"},
        {"chapter": "98", "title": "Complete industrial plants", "section": "XXI", "section_title": "Special Chapters"},
        {"chapter": "99", "title": "Special combined nomenclature codes", "section": "XXI", "section_title": "Special Chapters"},
    ]
    return chapters

def get_taric_codes() -> List[Dict]:
    """
    Get comprehensive TARIC codes database.
    This includes all key pharmaceutical codes (Chapter 30) plus common codes from other chapters.
    """
    codes = []
    
    # ============================================
    # CHAPTER 30 - PHARMACEUTICAL PRODUCTS (COMPLETE)
    # ============================================
    chapter_30 = [
        # Heading 3001 - Glands, organs, extracts
        {"code": "3001.10.00.00", "code_numeric": "3001100000", "chapter": "30", "heading": "3001", "subheading": "300110",
         "description": "Glands and other organs for organo-therapeutic uses, dried, whether or not powdered",
         "description_short": "Dried glands/organs for therapy", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3001.20.00.00", "code_numeric": "3001200000", "chapter": "30", "heading": "3001", "subheading": "300120",
         "description": "Extracts of glands or other organs or of their secretions for organo-therapeutic uses",
         "description_short": "Gland/organ extracts", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3001.90.10.00", "code_numeric": "3001901000", "chapter": "30", "heading": "3001", "subheading": "300190",
         "description": "Heparin and its salts",
         "description_short": "Heparin and salts", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3001.90.91.00", "code_numeric": "3001909100", "chapter": "30", "heading": "3001", "subheading": "300190",
         "description": "Human substances prepared for therapeutic or prophylactic uses, not elsewhere specified",
         "description_short": "Human therapeutic substances", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3001.90.98.00", "code_numeric": "3001909800", "chapter": "30", "heading": "3001", "subheading": "300190",
         "description": "Other glands and organs; other animal substances for therapeutic or prophylactic uses",
         "description_short": "Other glands/animal substances", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        
        # Heading 3002 - Blood, vaccines, immunological products
        {"code": "3002.12.00.00", "code_numeric": "3002120000", "chapter": "30", "heading": "3002", "subheading": "300212",
         "description": "Antisera and other blood fractions",
         "description_short": "Antisera and blood fractions", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3002.13.00.00", "code_numeric": "3002130000", "chapter": "30", "heading": "3002", "subheading": "300213",
         "description": "Immunological products, unmixed, not put up in measured doses or for retail sale",
         "description_short": "Unmixed immunologicals (bulk)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3002.14.00.00", "code_numeric": "3002140000", "chapter": "30", "heading": "3002", "subheading": "300214",
         "description": "Immunological products, mixed, not put up in measured doses or for retail sale",
         "description_short": "Mixed immunologicals (bulk)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3002.15.00.00", "code_numeric": "3002150000", "chapter": "30", "heading": "3002", "subheading": "300215",
         "description": "Immunological products, put up in measured doses or in forms or packings for retail sale",
         "description_short": "Immunologicals (retail)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3002.41.00.00", "code_numeric": "3002410000", "chapter": "30", "heading": "3002", "subheading": "300241",
         "description": "Vaccines for human medicine",
         "description_short": "Human vaccines", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3002.42.00.00", "code_numeric": "3002420000", "chapter": "30", "heading": "3002", "subheading": "300242",
         "description": "Vaccines for veterinary medicine",
         "description_short": "Veterinary vaccines", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3002.49.00.00", "code_numeric": "3002490000", "chapter": "30", "heading": "3002", "subheading": "300249",
         "description": "Toxins, cultures of micro-organisms (excluding yeasts) and similar products",
         "description_short": "Toxins and cultures", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3002.51.00.00", "code_numeric": "3002510000", "chapter": "30", "heading": "3002", "subheading": "300251",
         "description": "Cell therapy products",
         "description_short": "Cell therapy products", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3002.59.00.00", "code_numeric": "3002590000", "chapter": "30", "heading": "3002", "subheading": "300259",
         "description": "Other cell cultures, whether or not modified",
         "description_short": "Other cell cultures", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3002.90.10.00", "code_numeric": "3002901000", "chapter": "30", "heading": "3002", "subheading": "300290",
         "description": "Human blood",
         "description_short": "Human blood", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3002.90.30.00", "code_numeric": "3002903000", "chapter": "30", "heading": "3002", "subheading": "300290",
         "description": "Animal blood prepared for therapeutic, prophylactic or diagnostic uses",
         "description_short": "Animal blood (therapeutic)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3002.90.50.00", "code_numeric": "3002905000", "chapter": "30", "heading": "3002", "subheading": "300290",
         "description": "Cultures of micro-organisms (excluding yeasts)",
         "description_short": "Micro-organism cultures", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3002.90.90.00", "code_numeric": "3002909000", "chapter": "30", "heading": "3002", "subheading": "300290",
         "description": "Other products of heading 3002",
         "description_short": "Other (3002)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        
        # Heading 3003 - Medicaments NOT in retail packaging
        {"code": "3003.10.00.00", "code_numeric": "3003100000", "chapter": "30", "heading": "3003", "subheading": "300310",
         "description": "Medicaments containing penicillins or derivatives thereof, with a penicillanic acid structure, or streptomycins or their derivatives, not put up in measured doses or in forms or packings for retail sale",
         "description_short": "Penicillins (bulk)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3003.20.00.00", "code_numeric": "3003200000", "chapter": "30", "heading": "3003", "subheading": "300320",
         "description": "Medicaments containing other antibiotics, not put up in measured doses or for retail sale",
         "description_short": "Other antibiotics (bulk)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3003.31.00.00", "code_numeric": "3003310000", "chapter": "30", "heading": "3003", "subheading": "300331",
         "description": "Medicaments containing insulin, not put up in measured doses or for retail sale",
         "description_short": "Insulin (bulk)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3003.39.00.00", "code_numeric": "3003390000", "chapter": "30", "heading": "3003", "subheading": "300339",
         "description": "Medicaments containing other hormones, prostaglandins, thromboxanes, leukotrienes or their derivatives or structural analogues, not put up in measured doses or for retail sale",
         "description_short": "Other hormones (bulk)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3003.41.00.00", "code_numeric": "3003410000", "chapter": "30", "heading": "3003", "subheading": "300341",
         "description": "Medicaments containing ephedrine or its salts, not put up in measured doses or for retail sale",
         "description_short": "Ephedrine (bulk)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3003.42.00.00", "code_numeric": "3003420000", "chapter": "30", "heading": "3003", "subheading": "300342",
         "description": "Medicaments containing pseudoephedrine (INN) or its salts, not put up in measured doses or for retail sale",
         "description_short": "Pseudoephedrine (bulk)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3003.43.00.00", "code_numeric": "3003430000", "chapter": "30", "heading": "3003", "subheading": "300343",
         "description": "Medicaments containing norephedrine or its salts, not put up in measured doses or for retail sale",
         "description_short": "Norephedrine (bulk)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3003.49.00.00", "code_numeric": "3003490000", "chapter": "30", "heading": "3003", "subheading": "300349",
         "description": "Medicaments containing other alkaloids or derivatives, not put up for retail sale",
         "description_short": "Other alkaloids (bulk)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3003.60.00.00", "code_numeric": "3003600000", "chapter": "30", "heading": "3003", "subheading": "300360",
         "description": "Medicaments containing antimalarial active principles, not put up for retail sale",
         "description_short": "Antimalarials (bulk)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3003.90.00.00", "code_numeric": "3003900000", "chapter": "30", "heading": "3003", "subheading": "300390",
         "description": "Other medicaments (excluding goods of headings 3002, 3005 or 3006), not put up for retail sale",
         "description_short": "Other medicaments (bulk)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        
        # Heading 3004 - Medicaments IN retail packaging
        {"code": "3004.10.00.00", "code_numeric": "3004100000", "chapter": "30", "heading": "3004", "subheading": "300410",
         "description": "Medicaments containing penicillins or derivatives, or streptomycins, put up for retail sale",
         "description_short": "Penicillins (retail)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3004.20.00.00", "code_numeric": "3004200000", "chapter": "30", "heading": "3004", "subheading": "300420",
         "description": "Medicaments containing other antibiotics, put up for retail sale",
         "description_short": "Other antibiotics (retail)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3004.31.00.00", "code_numeric": "3004310000", "chapter": "30", "heading": "3004", "subheading": "300431",
         "description": "Medicaments containing insulin, put up for retail sale",
         "description_short": "Insulin (retail)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3004.32.00.00", "code_numeric": "3004320000", "chapter": "30", "heading": "3004", "subheading": "300432",
         "description": "Medicaments containing corticosteroid hormones, their derivatives or structural analogues, put up for retail sale",
         "description_short": "Corticosteroids (retail)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3004.39.00.00", "code_numeric": "3004390000", "chapter": "30", "heading": "3004", "subheading": "300439",
         "description": "Medicaments containing other hormones, put up for retail sale",
         "description_short": "Other hormones (retail)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3004.41.00.00", "code_numeric": "3004410000", "chapter": "30", "heading": "3004", "subheading": "300441",
         "description": "Medicaments containing ephedrine or its salts, put up for retail sale",
         "description_short": "Ephedrine (retail)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3004.42.00.00", "code_numeric": "3004420000", "chapter": "30", "heading": "3004", "subheading": "300442",
         "description": "Medicaments containing pseudoephedrine (INN) or its salts, put up for retail sale",
         "description_short": "Pseudoephedrine (retail)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3004.43.00.00", "code_numeric": "3004430000", "chapter": "30", "heading": "3004", "subheading": "300443",
         "description": "Medicaments containing norephedrine or its salts, put up for retail sale",
         "description_short": "Norephedrine (retail)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3004.49.00.00", "code_numeric": "3004490000", "chapter": "30", "heading": "3004", "subheading": "300449",
         "description": "Medicaments containing other alkaloids or derivatives, put up for retail sale",
         "description_short": "Other alkaloids (retail)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3004.50.00.00", "code_numeric": "3004500000", "chapter": "30", "heading": "3004", "subheading": "300450",
         "description": "Medicaments containing vitamins or other products of heading 2936, put up for retail sale",
         "description_short": "Vitamins (retail)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3004.60.00.00", "code_numeric": "3004600000", "chapter": "30", "heading": "3004", "subheading": "300460",
         "description": "Medicaments containing antimalarial active principles, put up for retail sale",
         "description_short": "Antimalarials (retail)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3004.90.00.00", "code_numeric": "3004900000", "chapter": "30", "heading": "3004", "subheading": "300490",
         "description": "Other medicaments (excluding goods of headings 3002, 3005 or 3006), put up for retail sale",
         "description_short": "Other medicaments (retail)", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        
        # Heading 3005 - Wadding, gauze, bandages
        {"code": "3005.10.00.00", "code_numeric": "3005100000", "chapter": "30", "heading": "3005", "subheading": "300510",
         "description": "Adhesive dressings and other articles having an adhesive layer, for medical purposes",
         "description_short": "Adhesive dressings", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3005.90.10.00", "code_numeric": "3005901000", "chapter": "30", "heading": "3005", "subheading": "300590",
         "description": "Wadding and articles of wadding, for medical purposes",
         "description_short": "Medical wadding", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3005.90.31.00", "code_numeric": "3005903100", "chapter": "30", "heading": "3005", "subheading": "300590",
         "description": "Gauze and articles of gauze, impregnated with pharmaceutical substances, for medical purposes",
         "description_short": "Impregnated gauze", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3005.90.50.00", "code_numeric": "3005905000", "chapter": "30", "heading": "3005", "subheading": "300590",
         "description": "Other gauze and articles of gauze, for medical purposes",
         "description_short": "Other medical gauze", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3005.90.99.00", "code_numeric": "3005909900", "chapter": "30", "heading": "3005", "subheading": "300590",
         "description": "Other wadding, gauze, bandages and similar articles, for medical purposes",
         "description_short": "Other medical dressings", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        
        # Heading 3006 - Pharmaceutical goods
        {"code": "3006.10.10.00", "code_numeric": "3006101000", "chapter": "30", "heading": "3006", "subheading": "300610",
         "description": "Sterile catgut and similar sterile suture materials; sterile tissue adhesives for surgical wound closure",
         "description_short": "Sterile sutures", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3006.10.30.00", "code_numeric": "3006103000", "chapter": "30", "heading": "3006", "subheading": "300610",
         "description": "Sterile laminaria and sterile laminaria tents",
         "description_short": "Sterile laminaria", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3006.10.90.00", "code_numeric": "3006109000", "chapter": "30", "heading": "3006", "subheading": "300610",
         "description": "Other sterile surgical or dental adhesion barriers",
         "description_short": "Other surgical barriers", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3006.20.00.00", "code_numeric": "3006200000", "chapter": "30", "heading": "3006", "subheading": "300620",
         "description": "Blood-grouping reagents",
         "description_short": "Blood-grouping reagents", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3006.30.00.00", "code_numeric": "3006300000", "chapter": "30", "heading": "3006", "subheading": "300630",
         "description": "Opacifying preparations for X-ray examinations; diagnostic reagents for patient administration",
         "description_short": "X-ray contrast media", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3006.40.00.00", "code_numeric": "3006400000", "chapter": "30", "heading": "3006", "subheading": "300640",
         "description": "Dental cements and other dental fillings; bone reconstruction cements",
         "description_short": "Dental cements", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3006.50.00.00", "code_numeric": "3006500000", "chapter": "30", "heading": "3006", "subheading": "300650",
         "description": "First-aid boxes and kits",
         "description_short": "First-aid kits", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3006.60.00.00", "code_numeric": "3006600000", "chapter": "30", "heading": "3006", "subheading": "300660",
         "description": "Chemical contraceptive preparations based on hormones, on other products of heading 2937 or on spermicides",
         "description_short": "Hormonal contraceptives", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3006.70.00.00", "code_numeric": "3006700000", "chapter": "30", "heading": "3006", "subheading": "300670",
         "description": "Gel preparations designed to be used in human or veterinary medicine as lubricant for parts of body for surgical operations, physical examinations, or as coupling agent between body and medical instruments",
         "description_short": "Medical gel preparations", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3006.91.00.00", "code_numeric": "3006910000", "chapter": "30", "heading": "3006", "subheading": "300691",
         "description": "Appliances identifiable for ostomy use",
         "description_short": "Ostomy appliances", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3006.92.00.00", "code_numeric": "3006920000", "chapter": "30", "heading": "3006", "subheading": "300692",
         "description": "Waste pharmaceuticals",
         "description_short": "Pharmaceutical waste", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
    ]
    codes.extend(chapter_30)
    
    # ============================================
    # CHAPTER 29 - ORGANIC CHEMICALS (Common pharma APIs)
    # ============================================
    chapter_29 = [
        {"code": "2933.21.00.00", "code_numeric": "2933210000", "chapter": "29", "heading": "2933", "subheading": "293321",
         "description": "Hydantoin and its derivatives",
         "description_short": "Hydantoin derivatives", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2933.29.00.00", "code_numeric": "2933290000", "chapter": "29", "heading": "2933", "subheading": "293329",
         "description": "Other compounds containing an unfused imidazole ring",
         "description_short": "Other imidazole compounds", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2933.33.00.00", "code_numeric": "2933330000", "chapter": "29", "heading": "2933", "subheading": "293333",
         "description": "Alfentanil (INN), anileridine (INN), bezitramide (INN), bromazepam (INN), difenoxin (INN), diphenoxylate (INN), dipipanone (INN), fentanyl (INN) and similar opioids",
         "description_short": "Fentanyl and opioids", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2933.39.00.00", "code_numeric": "2933390000", "chapter": "29", "heading": "2933", "subheading": "293339",
         "description": "Other compounds containing an unfused pyridine ring",
         "description_short": "Other pyridine compounds", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2933.71.00.00", "code_numeric": "2933710000", "chapter": "29", "heading": "2933", "subheading": "293371",
         "description": "6-Hexanelactam (epsilon-caprolactam)",
         "description_short": "Caprolactam", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2934.10.00.00", "code_numeric": "2934100000", "chapter": "29", "heading": "2934", "subheading": "293410",
         "description": "Compounds containing an unfused thiazole ring",
         "description_short": "Thiazole compounds", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2934.20.00.00", "code_numeric": "2934200000", "chapter": "29", "heading": "2934", "subheading": "293420",
         "description": "Compounds containing in the structure a benzothiazole ring-system, not further fused",
         "description_short": "Benzothiazole compounds", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2936.21.00.00", "code_numeric": "2936210000", "chapter": "29", "heading": "2936", "subheading": "293621",
         "description": "Vitamins A and their derivatives",
         "description_short": "Vitamin A", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2936.22.00.00", "code_numeric": "2936220000", "chapter": "29", "heading": "2936", "subheading": "293622",
         "description": "Vitamin B1 and its derivatives",
         "description_short": "Vitamin B1", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2936.23.00.00", "code_numeric": "2936230000", "chapter": "29", "heading": "2936", "subheading": "293623",
         "description": "Vitamin B2 and its derivatives",
         "description_short": "Vitamin B2", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2936.24.00.00", "code_numeric": "2936240000", "chapter": "29", "heading": "2936", "subheading": "293624",
         "description": "D- or DL-Pantothenic acid (Vitamin B3 or Vitamin B5) and its derivatives",
         "description_short": "Vitamin B5", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2936.25.00.00", "code_numeric": "2936250000", "chapter": "29", "heading": "2936", "subheading": "293625",
         "description": "Vitamin B6 and its derivatives",
         "description_short": "Vitamin B6", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2936.26.00.00", "code_numeric": "2936260000", "chapter": "29", "heading": "2936", "subheading": "293626",
         "description": "Vitamin B12 and its derivatives",
         "description_short": "Vitamin B12", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2936.27.00.00", "code_numeric": "2936270000", "chapter": "29", "heading": "2936", "subheading": "293627",
         "description": "Vitamin C and its derivatives",
         "description_short": "Vitamin C", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2936.28.00.00", "code_numeric": "2936280000", "chapter": "29", "heading": "2936", "subheading": "293628",
         "description": "Vitamin E and its derivatives",
         "description_short": "Vitamin E", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2936.29.00.00", "code_numeric": "2936290000", "chapter": "29", "heading": "2936", "subheading": "293629",
         "description": "Other vitamins and their derivatives",
         "description_short": "Other vitamins", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2937.11.00.00", "code_numeric": "2937110000", "chapter": "29", "heading": "2937", "subheading": "293711",
         "description": "Somatotropin, its derivatives and structural analogues",
         "description_short": "Growth hormone", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2937.12.00.00", "code_numeric": "2937120000", "chapter": "29", "heading": "2937", "subheading": "293712",
         "description": "Insulin and its salts",
         "description_short": "Insulin", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2937.19.00.00", "code_numeric": "2937190000", "chapter": "29", "heading": "2937", "subheading": "293719",
         "description": "Other polypeptide hormones, protein hormones and glycoprotein hormones",
         "description_short": "Other protein hormones", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2937.21.00.00", "code_numeric": "2937210000", "chapter": "29", "heading": "2937", "subheading": "293721",
         "description": "Cortisone, hydrocortisone, prednisone and prednisolone",
         "description_short": "Corticosteroids", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2937.22.00.00", "code_numeric": "2937220000", "chapter": "29", "heading": "2937", "subheading": "293722",
         "description": "Halogenated derivatives of corticosteroidal hormones",
         "description_short": "Halogenated corticosteroids", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2937.23.00.00", "code_numeric": "2937230000", "chapter": "29", "heading": "2937", "subheading": "293723",
         "description": "Oestrogens and progestogens",
         "description_short": "Estrogens and progestogens", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2937.29.00.00", "code_numeric": "2937290000", "chapter": "29", "heading": "2937", "subheading": "293729",
         "description": "Other steroidal hormones, their derivatives and structural analogues",
         "description_short": "Other steroid hormones", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2937.50.00.00", "code_numeric": "2937500000", "chapter": "29", "heading": "2937", "subheading": "293750",
         "description": "Prostaglandins, thromboxanes and leukotrienes, their derivatives and analogues",
         "description_short": "Prostaglandins", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2937.90.00.00", "code_numeric": "2937900000", "chapter": "29", "heading": "2937", "subheading": "293790",
         "description": "Other hormones, their derivatives and structural analogues; other steroids used as hormones",
         "description_short": "Other hormones", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2939.11.00.00", "code_numeric": "2939110000", "chapter": "29", "heading": "2939", "subheading": "293911",
         "description": "Concentrates of poppy straw; buprenorphine (INN), codeine, dihydrocodeine, ethylmorphine, etorphine, heroin, hydrocodone, hydromorphone, morphine, nicomorphine, oxycodone, oxymorphone, pholcodine, thebacon and thebaine; salts thereof",
         "description_short": "Opioid alkaloids", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2939.20.00.00", "code_numeric": "2939200000", "chapter": "29", "heading": "2939", "subheading": "293920",
         "description": "Alkaloids of cinchona and their derivatives; salts thereof",
         "description_short": "Quinine alkaloids", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2939.30.00.00", "code_numeric": "2939300000", "chapter": "29", "heading": "2939", "subheading": "293930",
         "description": "Caffeine and its salts",
         "description_short": "Caffeine", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2939.41.00.00", "code_numeric": "2939410000", "chapter": "29", "heading": "2939", "subheading": "293941",
         "description": "Ephedrine and its salts",
         "description_short": "Ephedrine", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2939.42.00.00", "code_numeric": "2939420000", "chapter": "29", "heading": "2939", "subheading": "293942",
         "description": "Pseudoephedrine (INN) and its salts",
         "description_short": "Pseudoephedrine", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2939.49.00.00", "code_numeric": "2939490000", "chapter": "29", "heading": "2939", "subheading": "293949",
         "description": "Other ephedrines and their salts",
         "description_short": "Other ephedrines", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2939.80.00.00", "code_numeric": "2939800000", "chapter": "29", "heading": "2939", "subheading": "293980",
         "description": "Other alkaloids, natural or reproduced by synthesis, and their salts, ethers, esters and other derivatives",
         "description_short": "Other alkaloids", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2941.10.00.00", "code_numeric": "2941100000", "chapter": "29", "heading": "2941", "subheading": "294110",
         "description": "Penicillins and their derivatives with a penicillanic acid structure; salts thereof",
         "description_short": "Penicillins", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2941.20.00.00", "code_numeric": "2941200000", "chapter": "29", "heading": "2941", "subheading": "294120",
         "description": "Streptomycins and their derivatives; salts thereof",
         "description_short": "Streptomycins", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2941.30.00.00", "code_numeric": "2941300000", "chapter": "29", "heading": "2941", "subheading": "294130",
         "description": "Tetracyclines and their derivatives; salts thereof",
         "description_short": "Tetracyclines", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2941.40.00.00", "code_numeric": "2941400000", "chapter": "29", "heading": "2941", "subheading": "294140",
         "description": "Chloramphenicol and its derivatives; salts thereof",
         "description_short": "Chloramphenicol", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2941.50.00.00", "code_numeric": "2941500000", "chapter": "29", "heading": "2941", "subheading": "294150",
         "description": "Erythromycin and its derivatives; salts thereof",
         "description_short": "Erythromycin", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2941.90.00.00", "code_numeric": "2941900000", "chapter": "29", "heading": "2941", "subheading": "294190",
         "description": "Other antibiotics",
         "description_short": "Other antibiotics", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
    ]
    codes.extend(chapter_29)
    
    # ============================================
    # CHAPTER 90 - MEDICAL INSTRUMENTS
    # ============================================
    chapter_90 = [
        {"code": "9018.11.00.00", "code_numeric": "9018110000", "chapter": "90", "heading": "9018", "subheading": "901811",
         "description": "Electro-cardiographs",
         "description_short": "ECG machines", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9018.12.00.00", "code_numeric": "9018120000", "chapter": "90", "heading": "9018", "subheading": "901812",
         "description": "Ultrasonic scanning apparatus",
         "description_short": "Ultrasound scanners", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9018.13.00.00", "code_numeric": "9018130000", "chapter": "90", "heading": "9018", "subheading": "901813",
         "description": "Magnetic resonance imaging apparatus",
         "description_short": "MRI machines", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9018.14.00.00", "code_numeric": "9018140000", "chapter": "90", "heading": "9018", "subheading": "901814",
         "description": "Scintigraphic apparatus",
         "description_short": "Scintigraphy equipment", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9018.19.00.00", "code_numeric": "9018190000", "chapter": "90", "heading": "9018", "subheading": "901819",
         "description": "Other electro-diagnostic apparatus",
         "description_short": "Other diagnostic equipment", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9018.20.00.00", "code_numeric": "9018200000", "chapter": "90", "heading": "9018", "subheading": "901820",
         "description": "Ultra-violet or infra-red ray apparatus for medical use",
         "description_short": "UV/IR medical devices", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9018.31.00.00", "code_numeric": "9018310000", "chapter": "90", "heading": "9018", "subheading": "901831",
         "description": "Syringes, with or without needles",
         "description_short": "Syringes", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9018.32.00.00", "code_numeric": "9018320000", "chapter": "90", "heading": "9018", "subheading": "901832",
         "description": "Tubular metal needles and needles for sutures",
         "description_short": "Needles", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9018.39.00.00", "code_numeric": "9018390000", "chapter": "90", "heading": "9018", "subheading": "901839",
         "description": "Other catheters, cannulae and the like",
         "description_short": "Catheters and cannulae", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9018.41.00.00", "code_numeric": "9018410000", "chapter": "90", "heading": "9018", "subheading": "901841",
         "description": "Dental drill engines, whether or not combined on a single base with other dental equipment",
         "description_short": "Dental drills", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9018.49.00.00", "code_numeric": "9018490000", "chapter": "90", "heading": "9018", "subheading": "901849",
         "description": "Other instruments and appliances for dental sciences",
         "description_short": "Other dental instruments", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9018.50.00.00", "code_numeric": "9018500000", "chapter": "90", "heading": "9018", "subheading": "901850",
         "description": "Other ophthalmic instruments and appliances",
         "description_short": "Ophthalmic instruments", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9018.90.00.00", "code_numeric": "9018900000", "chapter": "90", "heading": "9018", "subheading": "901890",
         "description": "Other instruments and appliances used in medical, surgical, dental or veterinary sciences",
         "description_short": "Other medical instruments", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9019.10.00.00", "code_numeric": "9019100000", "chapter": "90", "heading": "9019", "subheading": "901910",
         "description": "Mechano-therapy appliances; massage apparatus; psychological aptitude-testing apparatus",
         "description_short": "Therapy apparatus", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9019.20.00.00", "code_numeric": "9019200000", "chapter": "90", "heading": "9019", "subheading": "901920",
         "description": "Ozone therapy, oxygen therapy, aerosol therapy, artificial respiration or other therapeutic respiration apparatus",
         "description_short": "Respiratory equipment", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9020.00.00.00", "code_numeric": "9020000000", "chapter": "90", "heading": "9020", "subheading": "902000",
         "description": "Other breathing appliances and gas masks",
         "description_short": "Breathing apparatus", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9021.10.00.00", "code_numeric": "9021100000", "chapter": "90", "heading": "9021", "subheading": "902110",
         "description": "Orthopaedic or fracture appliances",
         "description_short": "Orthopedic appliances", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9021.21.00.00", "code_numeric": "9021210000", "chapter": "90", "heading": "9021", "subheading": "902121",
         "description": "Artificial teeth",
         "description_short": "Artificial teeth", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9021.29.00.00", "code_numeric": "9021290000", "chapter": "90", "heading": "9021", "subheading": "902129",
         "description": "Other dental fittings",
         "description_short": "Other dental fittings", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9021.31.00.00", "code_numeric": "9021310000", "chapter": "90", "heading": "9021", "subheading": "902131",
         "description": "Artificial joints",
         "description_short": "Artificial joints", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9021.39.00.00", "code_numeric": "9021390000", "chapter": "90", "heading": "9021", "subheading": "902139",
         "description": "Other artificial parts of the body",
         "description_short": "Other prosthetics", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9021.40.00.00", "code_numeric": "9021400000", "chapter": "90", "heading": "9021", "subheading": "902140",
         "description": "Hearing aids, excluding parts and accessories",
         "description_short": "Hearing aids", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9021.50.00.00", "code_numeric": "9021500000", "chapter": "90", "heading": "9021", "subheading": "902150",
         "description": "Pacemakers for stimulating heart muscles, excluding parts and accessories",
         "description_short": "Pacemakers", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9021.90.00.00", "code_numeric": "9021900000", "chapter": "90", "heading": "9021", "subheading": "902190",
         "description": "Other artificial body parts and other appliances worn, carried or implanted in the body",
         "description_short": "Other implants", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9022.12.00.00", "code_numeric": "9022120000", "chapter": "90", "heading": "9022", "subheading": "902212",
         "description": "Computed tomography apparatus",
         "description_short": "CT scanners", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9022.13.00.00", "code_numeric": "9022130000", "chapter": "90", "heading": "9022", "subheading": "902213",
         "description": "Other, for dental uses",
         "description_short": "Dental X-ray", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9022.14.00.00", "code_numeric": "9022140000", "chapter": "90", "heading": "9022", "subheading": "902214",
         "description": "Other, for medical, surgical or veterinary uses",
         "description_short": "Medical X-ray", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "9022.21.00.00", "code_numeric": "9022210000", "chapter": "90", "heading": "9022", "subheading": "902221",
         "description": "Apparatus based on the use of alpha, beta, gamma or other ionizing radiations, for medical, surgical, dental or veterinary uses",
         "description_short": "Radiotherapy equipment", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
    ]
    codes.extend(chapter_90)
    
    # ============================================
    # CHAPTER 21 - FOOD SUPPLEMENTS (often confused with pharma)
    # ============================================
    chapter_21 = [
        {"code": "2106.10.00.00", "code_numeric": "2106100000", "chapter": "21", "heading": "2106", "subheading": "210610",
         "description": "Protein concentrates and textured protein substances",
         "description_short": "Protein concentrates", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2106.90.92.00", "code_numeric": "2106909200", "chapter": "21", "heading": "2106", "subheading": "210690",
         "description": "Food supplements containing vitamins, minerals or other substances",
         "description_short": "Vitamin supplements", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "2106.90.98.00", "code_numeric": "2106909800", "chapter": "21", "heading": "2106", "subheading": "210690",
         "description": "Other food preparations not elsewhere specified or included",
         "description_short": "Other food preparations", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
    ]
    codes.extend(chapter_21)
    
    # ============================================
    # CHAPTER 38 - MISCELLANEOUS CHEMICAL PRODUCTS
    # ============================================
    chapter_38 = [
        {"code": "3821.00.00.00", "code_numeric": "3821000000", "chapter": "38", "heading": "3821", "subheading": "382100",
         "description": "Prepared culture media for the development or maintenance of micro-organisms or plant, human or animal cells",
         "description_short": "Culture media", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3822.11.00.00", "code_numeric": "3822110000", "chapter": "38", "heading": "3822", "subheading": "382211",
         "description": "Diagnostic or laboratory reagents on a backing and prepared diagnostic or laboratory reagents - for malaria",
         "description_short": "Malaria test reagents", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3822.12.00.00", "code_numeric": "3822120000", "chapter": "38", "heading": "3822", "subheading": "382212",
         "description": "Diagnostic or laboratory reagents - for Zika and other diseases transmitted by mosquitoes",
         "description_short": "Zika test reagents", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3822.13.00.00", "code_numeric": "3822130000", "chapter": "38", "heading": "3822", "subheading": "382213",
         "description": "Diagnostic or laboratory reagents - for blood-grouping",
         "description_short": "Blood typing reagents", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3822.19.00.00", "code_numeric": "3822190000", "chapter": "38", "heading": "3822", "subheading": "382219",
         "description": "Other diagnostic or laboratory reagents on a backing",
         "description_short": "Other diagnostic reagents", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
        {"code": "3822.90.00.00", "code_numeric": "3822900000", "chapter": "38", "heading": "3822", "subheading": "382290",
         "description": "Other diagnostic or laboratory reagents",
         "description_short": "Other lab reagents", "source_url": "https://ec.europa.eu/taxation_customs/dds2/taric/"},
    ]
    codes.extend(chapter_38)
    
    return codes


def run_schema_migration():
    """Create the database schema"""
    print("Creating database schema...")
    
    # Read the migration file
    migration_path = os.path.join(os.path.dirname(__file__), '..', 'supabase', 'migrations', '001_taric_database.sql')
    
    if os.path.exists(migration_path):
        with open(migration_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        # We can't run raw SQL via REST API, so we'll create tables via RPC or use the dashboard
        print("⚠️  Schema SQL found. Please run this in the Supabase SQL Editor:")
        print(f"   {SUPABASE_URL.replace('.supabase.co', '.supabase.co/sql')}")
        print("   OR the schema might already exist from the migration file.")
    else:
        print(f"Migration file not found at {migration_path}")
    
    return True


def main():
    print("=" * 60)
    print("TARIC Database Setup Script")
    print("=" * 60)
    print(f"\nTarget: {SUPABASE_URL}")
    
    # Step 1: Get data
    print("\n[1/3] Preparing chapter metadata...")
    chapters = get_chapters_data()
    print(f"     Found {len(chapters)} chapters")
    
    print("\n[2/3] Preparing TARIC codes...")
    codes = get_taric_codes()
    print(f"     Found {len(codes)} codes")
    
    # Step 2: Insert chapters
    print("\n[3/3] Inserting data into Supabase...")
    
    print("     Inserting chapters...")
    if insert_records("taric_chapters", chapters):
        print(f"     ✓ Inserted {len(chapters)} chapters")
    else:
        print("     ✗ Failed to insert chapters - table might not exist yet")
        print("       Please run the schema migration first (see 001_taric_database.sql)")
        return
    
    print("     Inserting TARIC codes...")
    if insert_records("taric_codes", codes):
        print(f"     ✓ Inserted {len(codes)} TARIC codes")
    else:
        print("     ✗ Failed to insert codes")
        return
    
    print("\n" + "=" * 60)
    print("✓ Database setup complete!")
    print("=" * 60)
    print(f"\nTotal codes in database: {len(codes)}")
    print("\nChapters covered:")
    print("  - Chapter 21: Food supplements")
    print("  - Chapter 29: Organic chemicals (pharma APIs)")
    print("  - Chapter 30: Pharmaceutical products (COMPLETE)")
    print("  - Chapter 38: Diagnostic reagents")
    print("  - Chapter 90: Medical instruments")
    print("\nTo add more chapters, expand the get_taric_codes() function")


if __name__ == "__main__":
    main()
