// Use legacy build that doesn't require web workers
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

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
  try {
    console.log('Starting PDF extraction for:', file.name, 'Size:', file.size);
    
    const arrayBuffer = await file.arrayBuffer();
    console.log('ArrayBuffer loaded, size:', arrayBuffer.byteLength);
    
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      verbosity: 0, // Reduce console spam
      disableAutoFetch: true,
      disableStream: true,
    });
    
    const pdf = await loadingTask.promise;
    console.log('PDF loaded successfully. Pages:', pdf.numPages);
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Extracting page ${i}/${pdf.numPages}...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => {
          // Handle both string and object items
          if (typeof item === 'string') return item;
          return item.str || '';
        })
        .join(' ');
      fullText += pageText + '\n';
      console.log(`Page ${i} extracted, length: ${pageText.length}`);
    }
    
    console.log('Total text extracted:', fullText.length, 'characters');
    
    // Check if we actually extracted any meaningful text
    if (!fullText.trim()) {
      throw new Error('PDF appears to be empty or contains only images. Please use OCR or paste text manually.');
    }
    
    return fullText;
  } catch (error) {
    console.error('PDF extraction error details:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Worker')) {
        throw new Error('PDF worker failed to load. Check your internet connection and try again.');
      }
      if (error.message.includes('Invalid PDF')) {
        throw new Error('Invalid or corrupted PDF file. Please try a different file.');
      }
      throw error;
    }
    
    throw new Error('Failed to extract text from PDF. The file may be corrupted or contain only images.');
  }
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
