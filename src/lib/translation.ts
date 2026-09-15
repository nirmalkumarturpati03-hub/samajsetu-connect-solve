/**
 * SamajSetu Automatic Translation Service
 * Translates regional language speech input to English automatically.
 * Supports all Indian regional languages (Hindi, Telugu, Tamil, Bengali, Marathi,
 * Gujarati, Kannada, Malayalam, Punjabi, Odia, Urdu, etc.) and other international languages.
 */

export const REGIONAL_LANGUAGE_NAMES: Record<string, string> = {
  hi: "Hindi (हिंदी)",
  te: "Telugu (తెలుగు)",
  ta: "Tamil (தமிழ்)",
  bn: "Bengali (বাংলা)",
  mr: "Marathi (मराठी)",
  gu: "Gujarati (ગુજરાતી)",
  kn: "Kannada (ಕನ್ನಡ)",
  ml: "Malayalam (മലയാളം)",
  pa: "Punjabi (ਪੰਜਾਬੀ)",
  or: "Odia (ଓଡ଼ିଆ)",
  ur: "Urdu (اردو)",
  ne: "Nepali (नेपाली)",
  as: "Assamese (অসমীয়া)",
  es: "Spanish (Español)",
  fr: "French (Français)",
  de: "German (Deutsch)",
  ar: "Arabic (العربية)",
};

/**
 * Detects regional language from Unicode character ranges
 */
export function detectScriptLanguage(text: string): string | null {
  if (!text) return null;
  if (/[\u0900-\u097F]/.test(text)) return "hi"; // Devanagari (Hindi, Marathi, Nepali)
  if (/[\u0C00-\u0C7F]/.test(text)) return "te"; // Telugu
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta"; // Tamil
  if (/[\u0980-\u09FF]/.test(text)) return "bn"; // Bengali / Assamese
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu"; // Gujarati
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn"; // Kannada
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml"; // Malayalam
  if (/[\u0A00-\u0A7F]/.test(text)) return "pa"; // Gurmukhi (Punjabi)
  if (/[\u0B00-\u0B7F]/.test(text)) return "or"; // Odia
  if (/[\u0600-\u06FF]/.test(text)) return "ur"; // Urdu / Arabic
  return null;
}

/**
 * Determines whether the given text or language locale is a regional / non-English input
 */
export function isLikelyRegionalOrNonEnglish(text: string, langLocale?: string): boolean {
  if (!text || !text.trim()) return false;
  
  // 1. Check if non-Latin regional script is detected
  if (detectScriptLanguage(text)) return true;

  // 2. Check if the active speech locale is non-English
  if (langLocale) {
    const code = langLocale.split("-")[0]?.toLowerCase();
    if (code && code !== "en" && code !== "en-in" && code !== "en-us") {
      // If language is set to a regional language and text has non-ASCII or letters
      if (/[^\x00-\x7F]/.test(text)) return true;
    }
  }

  // 3. Check for common Indic romanized civic grievance patterns (Hinglish/Tanglish/Tenglish)
  const indicRomanKeywords = [
    /\b(paani|pani|sadak|gaddha|gaddhe|bijli|kachra|nala|naala|aspataal|aspatal|gaon|gaao|kharaab|kharab|toota|chori|gali|mohalla|basti|kooda|safai|adhikari|pradhan|shikayat|puliya|dhuaan)\b/i,
    /\b(baagaledu|cheppandi|vellali|vandalu|neellu|velladam|ledhu|ledu|unnam|unnaru)\b/i, // Telugu roman
    /\b(thanni|rombavum|mosam|eriyala|valigiradhu|kuttai|theru)\b/i, // Tamil roman
  ];

  for (const regex of indicRomanKeywords) {
    if (regex.test(text)) return true;
  }

  return false;
}

export interface TranslationResult {
  translatedText: string;
  originalText: string;
  sourceLanguage: string;
  sourceLanguageName: string;
  isTranslated: boolean;
}

// In-memory cache for fast repeated lookups
const translationCache = new Map<string, string>();

/**
 * Translates a text chunk using MyMemory API with graceful fallbacks
 */
async function translateChunk(text: string, langPair: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  
  const cacheKey = `${langPair}::${trimmed}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${encodeURIComponent(langPair)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    const result = data?.responseData?.translatedText;
    if (result && typeof result === "string" && result.trim()) {
      // Clean HTML entities if returned by translation service
      const clean = result
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
      
      translationCache.set(cacheKey, clean);
      return clean;
    }
  } catch (err) {
    console.warn("Translation chunk failed, returning original text:", err);
  }

  return trimmed;
}

/**
 * Main Translation Function:
 * Automatically translates regional language voice or text into fluent English.
 */
export async function autoTranslateToEnglish(
  text: string,
  hintLangCode?: string
): Promise<TranslationResult> {
  const clean = text.trim();
  if (!clean) {
    return {
      translatedText: "",
      originalText: "",
      sourceLanguage: "en",
      sourceLanguageName: "English",
      isTranslated: false,
    };
  }

  // Detect script or use provided hint
  const scriptLang = detectScriptLanguage(clean);
  const langCode = scriptLang || (hintLangCode ? hintLangCode.split("-")[0]?.toLowerCase() : "autodetect") || "autodetect";

  // If already English without non-English signals, return directly
  if (langCode === "en" && !scriptLang && !isLikelyRegionalOrNonEnglish(clean)) {
    return {
      translatedText: clean,
      originalText: clean,
      sourceLanguage: "en",
      sourceLanguageName: "English",
      isTranslated: false,
    };
  }

  const langPair = `${langCode === "en" ? "autodetect" : langCode}|en`;
  const langName = REGIONAL_LANGUAGE_NAMES[langCode] || (scriptLang ? REGIONAL_LANGUAGE_NAMES[scriptLang] : "Regional Language") || "Regional Language";

  // Handle long text by splitting on sentence breaks if over 400 chars
  if (clean.length > 400) {
    const sentenceDelimiters = /([।\.!\?\n]+)/g;
    const parts = clean.split(sentenceDelimiters);
    const translatedParts: string[] = [];

    for (let i = 0; i < parts.length; i += 2) {
      const sentence = parts[i];
      const punctuation = parts[i + 1] || "";
      if (sentence && sentence.trim()) {
        const trans = await translateChunk(sentence, langPair);
        translatedParts.push(trans + (punctuation === "।" ? "." : punctuation));
      } else if (punctuation) {
        translatedParts.push(punctuation === "।" ? "." : punctuation);
      }
    }

    const fullTranslation = translatedParts.join(" ").replace(/\s+/g, " ").trim();
    return {
      translatedText: fullTranslation || clean,
      originalText: clean,
      sourceLanguage: langCode,
      sourceLanguageName: langName,
      isTranslated: fullTranslation.toLowerCase() !== clean.toLowerCase(),
    };
  }

  // Single chunk translation
  const translated = await translateChunk(clean, langPair);

  return {
    translatedText: translated || clean,
    originalText: clean,
    sourceLanguage: langCode,
    sourceLanguageName: langName,
    isTranslated: Boolean(translated && translated.toLowerCase().trim() !== clean.toLowerCase().trim()),
  };
}
