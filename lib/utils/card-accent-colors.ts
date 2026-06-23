import type { StudentType } from "@/types/student";

export interface CardAccentColors {
  headerBg: string;
  headerText: string;
  headerSubText: string;
  accentColor: string;
  avatarBg: string;
  borderColor: string;
  footerBg: string;
  footerBorder: string;
}

export function getCardAccentColors(studentType: StudentType): CardAccentColors {
  if (studentType === "subscription") {
    return {
      headerBg: "#e5322a",
      headerText: "#ffffff",
      headerSubText: "rgba(255,255,255,0.85)",
      accentColor: "#e5322a",
      avatarBg: "#fff1f0",
      borderColor: "#e5322a",
      footerBg: "#fff1f0",
      footerBorder: "#ffd9d6",
    };
  }
  return {
    headerBg: "#f4b400",
    headerText: "#1a1611",
    headerSubText: "rgba(26,22,17,0.75)",
    accentColor: "#d69400",
    avatarBg: "#fffbeb",
    borderColor: "#f4b400",
    footerBg: "#fffbeb",
    footerBorder: "#fff1b8",
  };
}
