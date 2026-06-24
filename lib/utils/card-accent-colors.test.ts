import { getCardAccentColors } from "./card-accent-colors";

describe("getCardAccentColors", () => {
  it("returns red palette for subscription students", () => {
    const colors = getCardAccentColors("subscription");
    expect(colors.headerBg).toBe("#e5322a");
    expect(colors.headerText).toBe("#ffffff");
    expect(colors.headerSubText).toBe("rgba(255,255,255,0.85)");
    expect(colors.accentColor).toBe("#e5322a");
    expect(colors.avatarBg).toBe("#fff1f0");
    expect(colors.borderColor).toBe("#e5322a");
    expect(colors.footerBg).toBe("#fff1f0");
    expect(colors.footerBorder).toBe("#ffd9d6");
  });

  it("returns yellow palette for non-subscription students", () => {
    const colors = getCardAccentColors("non_subscription");
    expect(colors.headerBg).toBe("#f4b400");
    expect(colors.headerText).toBe("#1a1611");
    expect(colors.headerSubText).toBe("rgba(26,22,17,0.75)");
    expect(colors.accentColor).toBe("#d69400");
    expect(colors.avatarBg).toBe("#fffbeb");
    expect(colors.borderColor).toBe("#f4b400");
    expect(colors.footerBg).toBe("#fffbeb");
    expect(colors.footerBorder).toBe("#fff1b8");
  });

  it("uses dark header text for non-subscription to meet contrast requirements", () => {
    const sub = getCardAccentColors("subscription");
    const nonSub = getCardAccentColors("non_subscription");
    expect(sub.headerText).toBe("#ffffff");
    expect(nonSub.headerText).toBe("#1a1611");
    expect(sub.headerText).not.toBe(nonSub.headerText);
  });
});
