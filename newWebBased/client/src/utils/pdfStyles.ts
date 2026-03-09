/**
 * PDF Styles Theme
 * Centralized styling configuration for all PDF exports (non-certificate)
 * 
 * Provides consistent:
 * - Color palette (headers, rankings, accents)
 * - Typography (fonts, sizes, weights)
 * - Spacing and dimensions
 * - Table styling (headers, rows, alternating)
 * 
 * Usage:
 *   import { pdfStyles } from '@/utils/pdfStyles'
 *   doc.setTextColor(...pdfStyles.colors.text)
 *   doc.setFontSize(pdfStyles.fonts.tableHeader.size)
 */

// ─────────────────────────────────────────────────────────────────
// Colors (RGB format for jsPDF)
// ─────────────────────────────────────────────────────────────────

export const pdfColors = {
  // Text colors
  text: {
    primary: [0, 0, 0] as const,        // Black
    secondary: [64, 64, 64] as const,   // Dark gray
    light: [128, 128, 128] as const,    // Medium gray
    white: [255, 255, 255] as const,    // White
  },

  // Background colors for table cells
  background: {
    header: [240, 248, 255] as const,   // Alice blue (table headers)
    even: [255, 255, 255] as const,     // White (even rows)
    odd: [250, 250, 250] as const,      // Off-white (odd rows, subtle)
  },

  // Ranking/Medal background colors
  ranking: {
    gold: [255, 250, 205] as const,     // Lemon chiffon (1st place)
    silver: [245, 245, 245] as const,   // Whitesmoke (2nd place)
    bronze: [255, 243, 224] as const,   // Bisque (3rd place)
  },

  // Accent colors for specific content
  accent: {
    primary: [33, 150, 243] as const,   // Blue (primary action, totals)
    success: [76, 175, 80] as const,    // Green (positive values)
    warning: [255, 152, 0] as const,    // Amber (warnings, cautions)
    error: [244, 67, 54] as const,      // Red (errors, critical)
  },

  // Border/line colors
  line: {
    default: [0, 0, 0] as const,        // Black
    light: [192, 192, 192] as const,    // Silver
  },
};

// ─────────────────────────────────────────────────────────────────
// Typography
// ─────────────────────────────────────────────────────────────────

export const pdfFonts = {
  // Default font family
  family: 'helvetica' as const,

  // Header/Title styles
  header: {
    family: 'helvetica' as const,
    size: 10,
    weight: 'normal' as const,
    color: pdfColors.text.primary,
  },

  // Table header cell styles
  tableHeader: {
    family: 'helvetica' as const,
    size: 9,
    weight: 'bold' as const,
    color: pdfColors.text.primary,
  },

  // Table body cell styles (normal)
  tableBody: {
    family: 'helvetica' as const,
    size: 8,
    weight: 'normal' as const,
    color: pdfColors.text.primary,
  },

  // Table total/summary row
  tableTotal: {
    family: 'helvetica' as const,
    size: 8,
    weight: 'bold' as const,
    color: pdfColors.accent.primary,
  },

  // Formula display (small, secondary information)
  formula: {
    family: 'helvetica' as const,
    size: 6,
    weight: 'normal' as const,
    color: pdfColors.text.secondary,
  },

  // Section titles (in-document headings)
  sectionTitle: {
    family: 'helvetica' as const,
    size: 12,
    weight: 'bold' as const,
    color: pdfColors.text.primary,
  },

  // Footer text (small)
  footer: {
    family: 'helvetica' as const,
    size: 8,
    weight: 'normal' as const,
    color: pdfColors.text.primary,
  },
};

// ─────────────────────────────────────────────────────────────────
// Spacing & Dimensions
// ─────────────────────────────────────────────────────────────────

export const pdfSpacing = {
  // Page margins
  margin: {
    top: 30,
    right: 10,
    bottom: 20,
    left: 10,
    headerHeight: 32,  // Header + separator + spacing
    footerHeight: 25,  // Footer + separator + spacing
  },

  // Header/Footer dimensions
  header: {
    height: 15,
    separator: { top: 12, thickness: 0.5 },
  },
  footer: {
    height: 15,
    separator: { top: 5, thickness: 0.5 },
  },

  // Section spacing
  section: {
    title: 8,      // Space before section title
    spacing: 6,    // Space between sections
  },

  // Table spacing
  table: {
    columnPadding: 3,
    rowHeight: 6,
  },
};

// ─────────────────────────────────────────────────────────────────
// Table Styles (for autoTable)
// ─────────────────────────────────────────────────────────────────

export const pdfTableStyles = {
  header: {
    fillColor: pdfColors.background.header,
    textColor: pdfColors.text.primary,
    fontStyle: 'bold' as const,
    fontSize: pdfFonts.tableHeader.size,
    halign: 'center' as const,
    valign: 'middle' as const,
  },

  body: {
    textColor: pdfColors.text.primary,
    fontSize: pdfFonts.tableBody.size,
    halign: 'center' as const,
    valign: 'middle' as const,
  },

  alternateRow: {
    fillColor: pdfColors.background.odd,
  },

  total: {
    fontStyle: 'bold' as const,
    textColor: pdfColors.accent.primary,
    backgroundColor: pdfColors.background.header,
    fillColor: pdfColors.background.header,
  },
};

// ─────────────────────────────────────────────────────────────────
// Ranking Badge Styles
// ─────────────────────────────────────────────────────────────────

export const pdfRankingStyles = {
  firstPlace: {
    background: [...pdfColors.ranking.gold] as const,
    text: [...pdfColors.text.primary] as const,
  },
  secondPlace: {
    background: [...pdfColors.ranking.silver] as const,
    text: [...pdfColors.text.primary] as const,
  },
  thirdPlace: {
    background: [...pdfColors.ranking.bronze] as const,
    text: [...pdfColors.text.primary] as const,
  },
  default: {
    background: [...pdfColors.background.even] as const,
    text: [...pdfColors.text.primary] as const,
  },
};

// ─────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Get ranking background color by rank position
 */
export function getRankingBackgroundColor(rank: number) {
  if (rank === 1) return pdfRankingStyles.firstPlace.background;
  if (rank === 2) return pdfRankingStyles.secondPlace.background;
  if (rank === 3) return pdfRankingStyles.thirdPlace.background;
  return pdfRankingStyles.default.background;
}

/**
 * Apply consistent header styling to jsPDF document
 */
export function applyHeaderStyle(doc: any): void {
  doc.setFont(pdfFonts.header.family, pdfFonts.header.weight);
  doc.setFontSize(pdfFonts.header.size);
  doc.setTextColor(...pdfFonts.header.color);
}

/**
 * Apply consistent table header styling to jsPDF document
 */
export function applyTableHeaderStyle(doc: any): void {
  doc.setFont(pdfFonts.tableHeader.family, pdfFonts.tableHeader.weight);
  doc.setFontSize(pdfFonts.tableHeader.size);
  doc.setTextColor(...pdfFonts.tableHeader.color);
}

/**
 * Apply consistent table body styling to jsPDF document
 */
export function applyTableBodyStyle(doc: any): void {
  doc.setFont(pdfFonts.tableBody.family, pdfFonts.tableBody.weight);
  doc.setFontSize(pdfFonts.tableBody.size);
  doc.setTextColor(...pdfFonts.tableBody.color);
}

/**
 * Apply consistent formula/small text styling to jsPDF document
 */
export function applyFormulaStyle(doc: any): void {
  doc.setFont(pdfFonts.formula.family, pdfFonts.formula.weight);
  doc.setFontSize(pdfFonts.formula.size);
  doc.setTextColor(...pdfFonts.formula.color);
}

/**
 * Apply consistent footer styling to jsPDF document
 */
export function applyFooterStyle(doc: any): void {
  doc.setFont(pdfFonts.footer.family, pdfFonts.footer.weight);
  doc.setFontSize(pdfFonts.footer.size);
  doc.setTextColor(...pdfFonts.footer.color);
}
