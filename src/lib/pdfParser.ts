import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ExtractedPharmaData {
  rawText: string;
  casNumbers: string[];
  activeIngredients: string[];
  safetyWarnings: string[];
  chemicalComposition: string[];
  formulation: string[];
  packaging: string[];
  therapeuticUse: string[];
  manufacturer: string | null;
  storage: string | null;
}

// Patterns for extracting pharma-specific data
const CAS_PATTERN = /\b\d{2,7}-\d{2}-\d\b/g;
const HAZARD_KEYWORDS = ['hazard', 'warning', 'danger', 'caution', 'toxic', 'flammable', 'corrosive', 'irritant', 'carcinogen', 'mutagen', 'h\d{3}', 'p\d{3}'];
const ACTIVE_KEYWORDS = ['active ingredient', 'active substance', 'api', 'drug substance', 'therapeutic agent'];
const FORMULATION_KEYWORDS = ['formulation', 'excipient', 'buffer', 'stabilizer', 'preservative', 'diluent', 'solvent'];
const PACKAGING_KEYWORDS = ['vial', 'syringe', 'ampoule', 'bottle', 'container', 'closure', 'stopper', 'glass', 'plastic', 'rubber'];
const THERAPEUTIC_KEYWORDS = ['indication', 'treatment', 'therapy', 'disease', 'condition', 'cancer', 'immunotherapy', 'oncology'];

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
}

export function extractPharmaData(text: string): ExtractedPharmaData {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const lowerText = text.toLowerCase();
  
  // Extract CAS numbers
  const casNumbers = [...new Set(text.match(CAS_PATTERN) || [])];
  
  // Extract safety warnings
  const safetyWarnings: string[] = [];
  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    if (HAZARD_KEYWORDS.some(kw => lowerLine.includes(kw) || new RegExp(kw, 'i').test(lowerLine))) {
      if (line.length > 10 && line.length < 500) {
        safetyWarnings.push(line);
      }
    }
  });
  
  // Extract active ingredients
  const activeIngredients: string[] = [];
  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    if (ACTIVE_KEYWORDS.some(kw => lowerLine.includes(kw))) {
      activeIngredients.push(line);
    }
  });
  
  // Extract chemical composition / formulation
  const chemicalComposition: string[] = [];
  const formulation: string[] = [];
  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    if (FORMULATION_KEYWORDS.some(kw => lowerLine.includes(kw))) {
      formulation.push(line);
    }
    // Look for percentage compositions
    if (/\d+\.?\d*\s*(%|mg|ml|g\/l|w\/v|v\/v)/i.test(line)) {
      chemicalComposition.push(line);
    }
  });
  
  // Extract packaging info
  const packaging: string[] = [];
  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    if (PACKAGING_KEYWORDS.some(kw => lowerLine.includes(kw))) {
      packaging.push(line);
    }
  });
  
  // Extract therapeutic use
  const therapeuticUse: string[] = [];
  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    if (THERAPEUTIC_KEYWORDS.some(kw => lowerLine.includes(kw))) {
      therapeuticUse.push(line);
    }
  });
  
  // Extract manufacturer
  let manufacturer: string | null = null;
  const manuMatch = lowerText.match(/manufacturer[:\s]+([^\n]+)/i);
  if (manuMatch) {
    manufacturer = manuMatch[1].trim();
  }
  
  // Extract storage conditions
  let storage: string | null = null;
  const storageMatch = lowerText.match(/storage[:\s]+([^\n]+)/i);
  if (storageMatch) {
    storage = storageMatch[1].trim();
  }
  
  return {
    rawText: text,
    casNumbers: [...new Set(casNumbers)],
    activeIngredients: [...new Set(activeIngredients)].slice(0, 5),
    safetyWarnings: [...new Set(safetyWarnings)].slice(0, 10),
    chemicalComposition: [...new Set(chemicalComposition)].slice(0, 10),
    formulation: [...new Set(formulation)].slice(0, 5),
    packaging: [...new Set(packaging)].slice(0, 5),
    therapeuticUse: [...new Set(therapeuticUse)].slice(0, 5),
    manufacturer,
    storage,
  };
}

export async function parseAndExtractPDF(file: File): Promise<ExtractedPharmaData> {
  const text = await extractTextFromPDF(file);
  return extractPharmaData(text);
}
