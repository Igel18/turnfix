/**
 * Shared status color utilities.
 *
 * Pure TypeScript — no React dependency so it can be used in
 * both server-side and client-side code.
 *
 * Moved to @turnfix/shared so that:
 *   - client (ScoreCaptureV2, SquadStatusManagement, …)
 *   - jury-portal (ScoringView, …)
 * share a single implementation with no duplication.
 *
 * The canonical type for a status option coming from the server is:
 *   StatusOption { id, name, colorCode }
 * which matches the output of GET /api/participant-status/statuses.
 */

import type { CSSProperties } from 'react';

// ─── Canonical status option type ────────────────────────────────────────────

/** A status entry as returned by GET /api/participant-status/statuses */
export interface StatusOption {
  id: number;
  name: string;
  colorCode: string | null;
}

// ─── Canonical table style constants ─────────────────────────────────────────

export const STATUS_TABLE_STYLES = {
  cell: 'px-4 py-3 text-sm text-gray-900',
  header: 'bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
  row: 'hover:bg-gray-50 transition-colors',
  badge: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  table: 'min-w-full divide-y divide-gray-200',
  tbody: 'bg-white divide-y divide-gray-200',
} as const;

// ─── Color parser ─────────────────────────────────────────────────────────────

const FALLBACK: { style: CSSProperties; className: string } = {
  style: {},
  className: 'bg-gray-100 text-gray-800 border border-gray-200',
};

/**
 * Parse a color code stored in the database and return inline style + Tailwind className
 * suitable for rendering a status badge.
 *
 * Supported color formats:
 *   - `{r,g,b}`       — curly-brace RGB (Qt legacy format)
 *   - `rgb(r, g, b)`  — CSS rgb() function
 *   - `#rrggbb`       — hex
 *   - `r,g,b`         — bare comma-separated
 *
 * Brightness algorithm:
 *   brightness = (r*299 + g*587 + b*114) / 1000
 *   If brightness < 128 → use a light background derived from the color, dark text
 *   Otherwise           → use the color itself as background, white/black text
 */
export function getStatusColor(
  colorCode: string | null | undefined
): { style: CSSProperties; className: string } {
  if (!colorCode) return FALLBACK;

  try {
    let r: number, g: number, b: number;

    if (colorCode.startsWith('{') && colorCode.endsWith('}')) {
      [r, g, b] = colorCode.slice(1, -1).split(',').map(v => parseInt(v.trim(), 10));
    } else if (colorCode.startsWith('rgb(') && colorCode.endsWith(')')) {
      [r, g, b] = colorCode.slice(4, -1).split(',').map(v => parseInt(v.trim(), 10));
    } else if (colorCode.startsWith('#')) {
      const hex = colorCode.slice(1);
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else {
      [r, g, b] = colorCode.split(',').map(v => parseInt(v.trim(), 10));
    }

    if (![r, g, b].every(v => Number.isFinite(v) && !isNaN(v) && v >= 0 && v <= 255)) {
      return FALLBACK;
    }

    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    let bgR: number, bgG: number, bgB: number;
    let textR: number, textG: number, textB: number;

    if (brightness < 128) {
      bgR = Math.min(255, r + Math.max(180, 255 - r));
      bgG = Math.min(255, g + Math.max(180, 255 - g));
      bgB = Math.min(255, b + Math.max(180, 255 - b));
      textR = Math.max(0, Math.min(r * 0.3, 80));
      textG = Math.max(0, Math.min(g * 0.3, 80));
      textB = Math.max(0, Math.min(b * 0.3, 80));
    } else {
      bgR = r;
      bgG = g;
      bgB = b;
      textR = textG = textB = brightness > 180 ? 0 : 255;
    }

    return {
      style: {
        backgroundColor: `rgb(${Math.round(bgR)}, ${Math.round(bgG)}, ${Math.round(bgB)})`,
        color: `rgb(${Math.round(textR)}, ${Math.round(textG)}, ${Math.round(textB)})`,
        borderColor: `rgb(${r}, ${g}, ${b})`,
      },
      className: 'border',
    };
  } catch {
    return FALLBACK;
  }
}
