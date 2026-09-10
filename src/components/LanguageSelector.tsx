import { Languages } from "lucide-react";
import { useEffect, useState } from "react";

const LANGUAGES = [
  ["en", "English", "en-IN"], ["hi", "हिंदी", "hi-IN"], ["bn", "বাংলা", "bn-IN"],
  ["ta", "தமிழ்", "ta-IN"], ["te", "తెలుగు", "te-IN"], ["mr", "मराठी", "mr-IN"],
  ["gu", "ગુજરાતી", "gu-IN"], ["kn", "ಕನ್ನಡ", "kn-IN"], ["ml", "മലയാളം", "ml-IN"],
  ["pa", "ਪੰਜਾਬੀ", "pa-IN"], ["ur", "اردو", "ur-IN"], ["or", "ଓଡ଼ିଆ", "or-IN"],
  ["ne", "नेपाली", "ne-NP"], ["as", "অসমীয়া", "as-IN"], ["es", "Español", "es-ES"],
  ["fr", "Français", "fr-FR"], ["de", "Deutsch", "de-DE"], ["ar", "العربية", "ar-SA"],
] as const;

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

export function voiceLocale(language: string) {
  return LANGUAGES.find(([code]) => code === language)?.[2] ?? "en-IN";
}

export function LanguageSelector({ onLanguageChange }: { onLanguageChange: (language: string) => void }) {
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    const saved = localStorage.getItem("samajsetu-language") ?? "en";
    setLanguage(saved);
    onLanguageChange(saved);
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement({ pageLanguage: "en", autoDisplay: false }, "google_translate_element");
    };
    if (!document.getElementById("samajsetu-google-translate")) {
      const script = document.createElement("script");
      script.id = "samajsetu-google-translate";
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google?.translate) window.googleTranslateElementInit();
    const hideTranslateChrome = () => {
      document.body.style.setProperty("top", "0", "important");
      document.documentElement.style.setProperty("top", "0", "important");
      document.querySelectorAll<HTMLElement>("iframe.goog-te-banner-frame, .goog-te-banner-frame, .goog-te-banner, #goog-gt-tt").forEach((element) => {
        element.style.setProperty("display", "none", "important");
        element.style.setProperty("visibility", "hidden", "important");
      });
    };
    hideTranslateChrome();
    const observer = new MutationObserver(hideTranslateChrome);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [onLanguageChange]);

  const changeLanguage = (next: string) => {
    localStorage.setItem("samajsetu-language", next);
    // Google Translate uses this first-party preference to translate the whole rendered page.
    document.cookie = next === "en" ? "googtrans=;path=/;max-age=0" : `googtrans=/en/${next};path=/;max-age=31536000`;
    onLanguageChange(next);
    window.location.reload();
  };

  return <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-semibold" title="Choose your language"><Languages size={15} className="shrink-0 text-primary" /><label className="sr-only" htmlFor="site-language">Select language</label><select id="site-language" value={language} onChange={(event) => changeLanguage(event.target.value)} className="max-w-24 bg-transparent outline-none sm:max-w-32">{LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select><div id="google_translate_element" className="hidden" /></div>;
}
