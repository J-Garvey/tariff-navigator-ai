import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// News sources to scrape for tariff updates
const NEWS_SOURCES = [
  {
    name: "EU Official Journal",
    url: "https://eur-lex.europa.eu/oj/direct-access.html",
    type: "official",
  },
  {
    name: "DG TAXUD News",
    url: "https://taxation-customs.ec.europa.eu/news_en",
    type: "official",
  },
  {
    name: "EU Trade Updates",
    url: "https://policy.trade.ec.europa.eu/news_en",
    type: "trade",
  },
];

// Keywords to look for in news articles
const TARIFF_KEYWORDS = [
  "taric", "tariff", "duty rate", "customs duty", "import duty",
  "pharmaceutical", "medicament", "vaccine", "antibody", "biologic",
  "chapter 30", "hs code", "cn code", "customs code",
  "rate change", "duty increase", "duty reduction", "suspension",
  "regulation", "amendment", "implementing regulation"
];

interface NewsItem {
  title: string;
  summary: string;
  source_url: string;
  source_name: string;
  published_at: string | null;
  affected_codes: string[];
  change_type: string | null;
  effective_date: string | null;
}

// Fetch and parse a webpage
async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "EasyShipAI-TariffMonitor/1.0 (tariff monitoring service)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

// Extract TARIC codes from text
function extractTaricCodes(text: string): string[] {
  const codes: string[] = [];
  
  // Match patterns like 3004.90.00.00 or 3004900000 or 3004 90 00 00
  const patterns = [
    /\b(\d{4}\.\d{2}\.\d{2}\.\d{2})\b/g,
    /\b(\d{4}\s\d{2}\s\d{2}\s\d{2})\b/g,
    /\b(\d{10})\b/g, // 10 digits together
    /\bCN\s*code[s]?\s*[:=]?\s*(\d{4,10})/gi,
    /\bHS\s*code[s]?\s*[:=]?\s*(\d{4,10})/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const code = match[1].replace(/\s/g, "");
      // Only include codes that look like Chapter 30 (pharmaceuticals)
      if (code.startsWith("30") && code.length >= 4) {
        codes.push(code);
      }
    }
  }
  
  return [...new Set(codes)];
}

// Determine the type of change from the text
function detectChangeType(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("increase") || lowerText.includes("higher")) {
    return "duty_increase";
  }
  if (lowerText.includes("decrease") || lowerText.includes("reduction") || lowerText.includes("lower")) {
    return "duty_decrease";
  }
  if (lowerText.includes("suspend") || lowerText.includes("suspension")) {
    return "suspension";
  }
  if (lowerText.includes("new code") || lowerText.includes("add")) {
    return "new_code";
  }
  if (lowerText.includes("amend") || lowerText.includes("modif")) {
    return "amendment";
  }
  if (lowerText.includes("regulation")) {
    return "new_regulation";
  }
  
  return null;
}

// Extract date from text
function extractDate(text: string): string | null {
  // Match patterns like "1 January 2024", "01/01/2024", "2024-01-01"
  const patterns = [
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/gi,
    /(\d{4})-(\d{2})-(\d{2})/g,
    /(\d{2})\/(\d{2})\/(\d{4})/g,
  ];
  
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      // Return as ISO date string
      try {
        const date = new Date(match[0]);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split("T")[0];
        }
      } catch {
        // Continue to next pattern
      }
    }
  }
  
  return null;
}

// Check if text is relevant to pharmaceutical tariffs
function isRelevantToPharmaTariffs(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Must contain tariff-related keywords
  const hasTariffKeyword = TARIFF_KEYWORDS.some(kw => lowerText.includes(kw));
  if (!hasTariffKeyword) return false;
  
  // Extra points for pharmaceutical relevance
  const pharmaKeywords = ["pharmaceutical", "medicament", "vaccine", "medicine", "drug", "chapter 30", "3001", "3002", "3003", "3004", "3005", "3006"];
  const hasPharmaKeyword = pharmaKeywords.some(kw => lowerText.includes(kw));
  
  return hasPharmaKeyword || hasTariffKeyword;
}

// Parse news from DG TAXUD
async function scrapeTaxudNews(): Promise<NewsItem[]> {
  const html = await fetchPage("https://taxation-customs.ec.europa.eu/news_en");
  if (!html) return [];
  
  const items: NewsItem[] = [];
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    if (!doc) return [];
    
    // Look for news article elements (structure may vary)
    const articles = doc.querySelectorAll("article, .views-row, .news-item");
    
    for (const article of articles) {
      const titleEl = article.querySelector("h2, h3, .title, a");
      const summaryEl = article.querySelector("p, .summary, .teaser");
      const linkEl = article.querySelector("a[href]");
      const dateEl = article.querySelector("time, .date");
      
      if (!titleEl) continue;
      
      const title = titleEl.textContent?.trim() || "";
      const summary = summaryEl?.textContent?.trim() || "";
      const fullText = title + " " + summary;
      
      if (!isRelevantToPharmaTariffs(fullText)) continue;
      
      const url = linkEl?.getAttribute("href") || "";
      const fullUrl = url.startsWith("http") ? url : `https://taxation-customs.ec.europa.eu${url}`;
      
      items.push({
        title,
        summary,
        source_url: fullUrl,
        source_name: "DG TAXUD",
        published_at: dateEl?.getAttribute("datetime") || extractDate(fullText),
        affected_codes: extractTaricCodes(fullText),
        change_type: detectChangeType(fullText),
        effective_date: extractDate(fullText),
      });
    }
  } catch (error) {
    console.error("Error parsing TAXUD news:", error);
  }
  
  return items;
}

// Parse news from EUR-Lex Official Journal
async function scrapeEurLex(): Promise<NewsItem[]> {
  // EUR-Lex has a search API we can use
  const searchUrl = "https://eur-lex.europa.eu/search.html?type=act&qid=tariff+pharmaceutical+regulation&ELI_SU_TA=TRUE";
  const html = await fetchPage(searchUrl);
  if (!html) return [];
  
  const items: NewsItem[] = [];
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    if (!doc) return [];
    
    const results = doc.querySelectorAll(".SearchResult, .result-item");
    
    for (const result of results) {
      const titleEl = result.querySelector(".title, h3, a");
      const summaryEl = result.querySelector(".summary, p");
      const linkEl = result.querySelector("a[href*='legal-content']");
      
      if (!titleEl) continue;
      
      const title = titleEl.textContent?.trim() || "";
      const summary = summaryEl?.textContent?.trim() || "";
      const fullText = title + " " + summary;
      
      if (!isRelevantToPharmaTariffs(fullText)) continue;
      
      const url = linkEl?.getAttribute("href") || "";
      const fullUrl = url.startsWith("http") ? url : `https://eur-lex.europa.eu${url}`;
      
      items.push({
        title,
        summary,
        source_url: fullUrl,
        source_name: "EUR-Lex",
        published_at: extractDate(fullText),
        affected_codes: extractTaricCodes(fullText),
        change_type: detectChangeType(fullText),
        effective_date: extractDate(fullText),
      });
    }
  } catch (error) {
    console.error("Error parsing EUR-Lex:", error);
  }
  
  return items;
}

// Save news items to database
async function saveNewsItems(items: NewsItem[]): Promise<number> {
  let saved = 0;
  
  for (const item of items) {
    try {
      // Check if already exists (by URL)
      const { data: existing } = await supabase
        .from("taric_news")
        .select("id")
        .eq("source_url", item.source_url)
        .single();
      
      if (existing) continue; // Skip duplicates
      
      const { error } = await supabase
        .from("taric_news")
        .insert({
          title: item.title,
          summary: item.summary,
          source_url: item.source_url,
          source_name: item.source_name,
          published_at: item.published_at,
          affected_codes: item.affected_codes,
          change_type: item.change_type,
          effective_date: item.effective_date,
          processed: false,
        });
      
      if (!error) saved++;
    } catch (error) {
      console.error("Error saving news item:", error);
    }
  }
  
  return saved;
}

// Process unprocessed news items and update TARIC codes if needed
async function processNewsUpdates(): Promise<number> {
  const { data: unprocessed } = await supabase
    .from("taric_news")
    .select("*")
    .eq("processed", false)
    .limit(10);
  
  if (!unprocessed || unprocessed.length === 0) return 0;
  
  let processed = 0;
  
  for (const news of unprocessed) {
    if (news.affected_codes && news.affected_codes.length > 0) {
      for (const code of news.affected_codes) {
        // Check if code exists in our database
        const { data: existingCode } = await supabase
          .from("taric_codes")
          .select("code, duty_rate")
          .eq("code_numeric", code.replace(/\./g, ""))
          .single();
        
        if (existingCode && news.change_type) {
          // Record the change
          await supabase
            .from("taric_changes")
            .insert({
              code: existingCode.code,
              change_type: news.change_type,
              old_value: existingCode.duty_rate,
              new_value: { detected_from_news: true, news_id: news.id },
              regulation_reference: news.title,
              effective_date: news.effective_date,
              source_url: news.source_url,
              processed: false,
            });
        }
      }
    }
    
    // Mark as processed
    await supabase
      .from("taric_news")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("id", news.id);
    
    processed++;
  }
  
  return processed;
}

// Get recent news for display
async function getRecentNews(limit: number = 10): Promise<any[]> {
  const { data } = await supabase
    .from("taric_news")
    .select("*")
    .order("scraped_at", { ascending: false })
    .limit(limit);
  
  return data || [];
}

// Get unprocessed changes that need manual review
async function getPendingChanges(): Promise<any[]> {
  const { data } = await supabase
    .from("taric_changes")
    .select("*, taric_codes(description)")
    .eq("processed", false)
    .order("detected_at", { ascending: false })
    .limit(20);
  
  return data || [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "scrape";
    
    let result: any;
    
    switch (action) {
      case "scrape": {
        // Scrape all sources
        console.log("Starting tariff news scrape...");
        const taxudNews = await scrapeTaxudNews();
        const eurLexNews = await scrapeEurLex();
        
        const allNews = [...taxudNews, ...eurLexNews];
        const saved = await saveNewsItems(allNews);
        
        result = {
          scraped: allNews.length,
          saved,
          sources: ["DG TAXUD", "EUR-Lex"],
        };
        break;
      }
      
      case "process": {
        // Process unprocessed news and detect code changes
        const processed = await processNewsUpdates();
        result = { processed };
        break;
      }
      
      case "news": {
        // Get recent news
        const limit = parseInt(url.searchParams.get("limit") || "10");
        result = await getRecentNews(limit);
        break;
      }
      
      case "changes": {
        // Get pending changes
        result = await getPendingChanges();
        break;
      }
      
      case "full": {
        // Full run: scrape + process
        console.log("Running full scrape and process...");
        const taxudNews = await scrapeTaxudNews();
        const eurLexNews = await scrapeEurLex();
        const allNews = [...taxudNews, ...eurLexNews];
        const saved = await saveNewsItems(allNews);
        const processed = await processNewsUpdates();
        
        result = {
          scraped: allNews.length,
          saved,
          processed,
          timestamp: new Date().toISOString(),
        };
        break;
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scraper error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Scraper failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
