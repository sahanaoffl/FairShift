import type { Language, Organisation, PayRules } from "@/src/types";

export interface IndustryProfile {
  id: Organisation["industry"];
  name: string;
  roles: string[];
  shiftTypes: string[];
  payRules: PayRules;
  reportCategories: { key: string; icon: string; labels: Record<Language, string> }[];
  skills: string[];
  labels: Record<Language, { worker: string; shift: string; pay: string }>;
}

export const industryProfiles: Record<IndustryProfile["id"], IndustryProfile> = {
  construction: {
    id: "construction",
    name: "Construction Site",
    roles: ["Mason", "Electrician", "Helper", "Supervisor"],
    shiftTypes: ["Day", "Night"],
    payRules: {
      currency: "INR",
      payMode: "daily",
      hourlyRateRupees: 100,
      regularHoursPerShift: 8,
      overtimeMultiplier: 1.5,
      deductions: [
        { key: "pf", ratePercent: 12 },
        { key: "esi", ratePercent: 0.75 },
      ],
    },
    reportCategories: [
      { key: "safety_hazard", icon: "⚠️", labels: { en: "Safety hazard", ta: "பாதுகாப்பு ஆபத்து", hi: "सुरक्षा खतरा" } },
      { key: "wage_issue", icon: "₹", labels: { en: "Wage issue", ta: "ஊதியப் பிரச்சினை", hi: "वेतन समस्या" } },
      { key: "harassment", icon: "🛡️", labels: { en: "Harassment", ta: "துன்புறுத்தல்", hi: "उत्पीड़न" } },
      { key: "equipment", icon: "🧰", labels: { en: "Equipment", ta: "உபகரணங்கள்", hi: "उपकरण" } },
      { key: "facilities", icon: "🚻", labels: { en: "Facilities", ta: "வசதிகள்", hi: "सुविधाएँ" } },
    ],
    skills: ["Scaffolding", "Electrical", "Working at Height", "First Aid"],
    labels: {
      en: { worker: "Worker", shift: "Shift", pay: "Pay" },
      ta: { worker: "தொழிலாளர்", shift: "பணி நேரம்", pay: "ஊதியம்" },
      hi: { worker: "कर्मचारी", shift: "पाली", pay: "वेतन" },
    },
  },
  college: {
    id: "college",
    name: "College",
    roles: ["Housekeeping", "Security", "Lab Assistant", "Guest Lecturer"],
    shiftTypes: ["Morning", "Evening"],
    payRules: {
      currency: "INR",
      payMode: "hourly",
      hourlyRateRupees: 125,
      expectedMonthlyHours: 160,
      regularHoursPerShift: 8,
      overtimeMultiplier: 1.25,
      deductions: [{ key: "pf", ratePercent: 12 }],
    },
    reportCategories: [
      { key: "workload", icon: "📚", labels: { en: "Workload", ta: "வேலைச்சுமை", hi: "काम का बोझ" } },
      { key: "harassment", icon: "🛡️", labels: { en: "Harassment", ta: "துன்புறுத்தல்", hi: "उत्पीड़न" } },
      { key: "facilities", icon: "🚻", labels: { en: "Facilities", ta: "வசதிகள்", hi: "सुविधाएँ" } },
      { key: "safety_hazard", icon: "⚠️", labels: { en: "Safety hazard", ta: "பாதுகாப்பு ஆபத்து", hi: "सुरक्षा खतरा" } },
      { key: "pay_issue", icon: "₹", labels: { en: "Pay issue", ta: "ஊதியப் பிரச்சினை", hi: "वेतन समस्या" } },
    ],
    skills: ["Fire Safety", "First Aid", "Lab Safety", "Computer Basics"],
    labels: {
      en: { worker: "Staff member", shift: "Shift", pay: "Salary" },
      ta: { worker: "பணியாளர்", shift: "பணி நேரம்", pay: "சம்பளம்" },
      hi: { worker: "कर्मचारी", shift: "पाली", pay: "वेतन" },
    },
  },
};

export function getIndustryProfile(industry: IndustryProfile["id"]): IndustryProfile {
  return industryProfiles[industry];
}
