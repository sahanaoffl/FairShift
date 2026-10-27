import type { Urgency } from "@/src/types";

const safetyTerms = [
  "fall", "fell", "fallen", "helmet", "electric shock", "shock", "no harness", "harness", "fire", "unsafe",
  "விழு", "தலைக்கவசம்", "மின்சாரம்", "மின்சார அதிர்ச்சி", "தீ", "பாதுகாப்பற்ற",
  "गिर", "हेलमेट", "बिजली का झटका", "करंट", "आग", "असुरक्षित",
];
const harassmentTerms = ["harass", "threat", "துன்புறுத்த", "மிரட்ட", "उत्पीड़न", "धमकी"];
const payTerms = ["wage", "salary", "pay", "ஊதியம்", "சம்பளம்", "वेतन", "तनख्वाह"];

export interface TriageResult {
  category: string;
  urgency: Urgency;
  language: "en" | "ta" | "hi";
  englishSummary: string;
  englishTranslation: string;
  keyThemes: string[];
  triageSource: "rules";
}

export function triageFallback(text: string, reportedCategory = "other"): TriageResult {
  const normalized = text.toLocaleLowerCase();
  const contains = (terms: string[]) => terms.some((term) => normalized.includes(term));
  const language = /[\u0B80-\u0BFF]/.test(text) ? "ta" : /[\u0900-\u097F]/.test(text) ? "hi" : "en";
  const isSafety = contains(safetyTerms);
  const isHarassment = contains(harassmentTerms);
  const isPay = contains(payTerms);
  const category = isSafety ? "safety_hazard" : isHarassment ? "harassment" : isPay ? "wage_issue" : reportedCategory;
  return {
    category,
    urgency: isSafety ? "high" : isHarassment ? "high" : "medium",
    language,
    englishSummary: "A worker reported an issue that needs review.",
    englishTranslation: text.slice(0, 1000),
    keyThemes: [category],
    triageSource: "rules",
  };
}
