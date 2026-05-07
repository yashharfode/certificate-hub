export function generateCertId(prefix = "DLX") {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${year}-${rand}`;
}

export function safeFilename(s: string) {
  return s.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 60);
}

export const TEMPLATES = [
  { id: "royal-navy", name: "Royal Navy & Gold", description: "Classic premium with gold border, script signature" },
  { id: "modern-minimal", name: "Modern Minimal", description: "Clean light layout with bold accent" },
  { id: "bold-hackathon", name: "Bold Hackathon", description: "High-contrast tech vibe with neon accent" },
  { id: "elegant-script", name: "Elegant Script", description: "Cream parchment, calligraphy heading" },
  { id: "corporate-formal", name: "Corporate Formal", description: "Conservative blue, double border" },
] as const;

export type TemplateId = (typeof TEMPLATES)[number]["id"];