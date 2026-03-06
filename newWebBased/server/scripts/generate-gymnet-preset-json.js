#!/usr/bin/env node
/**
 * One-time generator script: Extracts the hardcoded GymNet preset data
 * from gymnetPreset.ts into a comprehensive JSON file.
 * 
 * Run: node scripts/generate-gymnet-preset-json.js
 * Output: src/data/json/gymnet-preset.json
 */

const fs = require('fs');
const path = require('path');

// ---- Discipline IDs (from gymnetDisciplineIds.ts) ----
const D = {
  BODEN: 1, PAUSCHENPFERD: 2, RINGE: 3, SPRUNG: 4, BARREN: 5, RECK: 6,
  SPRUNG_W: 7, STUFENBARREN: 8, SCHWEBEBALKEN: 9, BODEN_W: 10,
  MINITRAMPOLIN: 11, GERAETEBAHN_A: 12, GERAETEBAHN_B: 13,
  LK1: 14, LK2: 15, LK3: 16, AK: 17, KM: 18, KM2: 19, KM3: 20,
  BODEN_M_KUER: 21, P_PFERD_KUER: 22, RINGE_M: 23, SPRUNG_M_KUER: 24, PAR_BARREN_KUER: 25, RECK_M_KUER: 26,
  BODEN_W_KUER: 27, SPRUNG_W_KUER: 28,
  BODEN_M_LK1: 31, P_PFERD_LK1: 32, RINGE_LK1: 33, SPRUNG_M_LK1: 34, PAR_BARREN_LK1: 35, RECK_M_LK1: 36,
  SPRUNG_W_LK1: 37, STUFENBARREN_LK1: 38, SCHWEBEBALKEN_LK1: 39, BODEN_W_LK1: 40,
  BODEN_M_LK2: 41, P_PFERD_LK2: 42, RINGE_LK2: 43, SPRUNG_M_LK2: 44, PAR_BARREN_LK2: 45, RECK_M_LK2: 46,
  SPRUNG_W_LK2: 47, STUFENBARREN_LK2: 48, SCHWEBEBALKEN_LK2: 49, BODEN_W_LK2: 50,
  BODEN_M_LK3: 51, P_PFERD_LK3: 52, RINGE_LK3: 53, SPRUNG_M_LK3: 54, PAR_BARREN_LK3: 55, RECK_M_LK3: 56,
  SPRUNG_W_LK3: 57, STUFENBARREN_LK3: 58, SCHWEBEBALKEN_LK3: 59, BODEN_W_LK3: 60,
  BODEN_M_P: 61, PAUSCHENPFERD_P: 62, RINGE_P: 63, SPRUNG_M_P: 64, PAR_BARREN_P: 65, RECK_M_P: 66,
  SPRUNG_W_P: 67, RECK_STUBA_P: 68, SCHWEBEBALKEN_P: 69, BODEN_W_P: 70,
  TURN10: 71, BODEN_TURN10: 72, BALKEN_BANK_TURN10: 73, P_BARREN_TURN10: 74,
  MINITRAMPOLIN_TURN10: 75, RECK_STBARREN_TURN10: 76, SPRUNG_TURN10: 77,
  BODEN_AK: 78
};

// ---- Field templates ----
const benutzerdefiniert_fields = [
  { name: 'Wertung', sortierung: 1 },
  { name: 'Endwert', sortierung: 2 }
];

const lk_fields = [
  { name: 'D-Note', sortierung: 1 },
  { name: 'E-Note', sortierung: 2 },
  { name: 'N-Abzüge', sortierung: 3 },
  { name: 'Endwert', sortierung: 4 }
];

const p_fields = [
  { name: 'Stufe', sortierung: 1 },
  { name: 'AbzugAusf.', sortierung: 2 },
  { name: 'Endwert', sortierung: 3 }
];

const turn10_fields = [
  { name: 'Wert', sortierung: 1 },
  { name: 'Abzug', sortierung: 2 },
  { name: 'Endwert', sortierung: 3 }
];

const ak_fields = [
  { name: 'Ausgangswert', sortierung: 1 },
  { name: 'AbzugAusf.', sortierung: 2 },
  { name: 'AbzugSonst.', sortierung: 3 },
  { name: 'Endwert', sortierung: 4 }
];

// ---- Build the preset data ----
const preset = {
  "$comment": "GymNet preset data for TurnFix database initialization. Edit this file to change disciplines/formulas without rebuilding.",
  version: "2.0",
  maxPresetDisciplineId: 78,

  formulas: [
    { name: 'P-Wettkampf', formula: '(10 + A) - B', type: 0, description: 'P-Stufen Wettkampf (Stufe + 10 - Abzug)' },
    { name: 'AK', formula: 'A - B - C', type: 0, description: 'Alterklassen (Ausgangswert - Abzug Ausf. - Abzug Sonst.)' },
    { name: 'LK', formula: 'A + B - C', type: 0, description: 'Leistungsklassen (D-Note + E-Note - N-Abzüge)' },
    { name: 'Benutzerdefiniert', formula: '1*x', type: 0, description: 'Einfache Durchreichung (Wertung → Endwert = 1*x)' }
  ],

  devices: [
    // === Basis-Geräte (1-13) ===
    { id: D.BODEN, name: 'Boden', anzeigename: 'Boden', kurzname: 'BODEN', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'Benutzerdefiniert', sport: 'Turnen DTB', bol_m: true, bol_w: true, fields: benutzerdefiniert_fields },
    { id: D.PAUSCHENPFERD, name: 'Pauschenpferd', anzeigename: 'Pauschenpferd', kurzname: 'PFERD', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/seitpferd.png', formula: 'Benutzerdefiniert', sport: 'Turnen DTB', bol_m: true, bol_w: false, fields: benutzerdefiniert_fields },
    { id: D.RINGE, name: 'Ringe', anzeigename: 'Ringe', kurzname: 'RINGE', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/ringe.png', formula: 'Benutzerdefiniert', sport: 'Turnen DTB', bol_m: true, bol_w: false, fields: benutzerdefiniert_fields },
    { id: D.SPRUNG, name: 'Sprung', anzeigename: 'Sprung', kurzname: 'SPRNG', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'Benutzerdefiniert', sport: 'Turnen DTB', bol_m: true, bol_w: true, fields: benutzerdefiniert_fields },
    { id: D.BARREN, name: 'Barren', anzeigename: 'Barren', kurzname: 'BARR', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/barren.png', formula: 'Benutzerdefiniert', sport: 'Turnen DTB', bol_m: true, bol_w: false, fields: benutzerdefiniert_fields },
    { id: D.RECK, name: 'Reck', anzeigename: 'Reck', kurzname: 'RECK', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/reck.png', formula: 'Benutzerdefiniert', sport: 'Turnen DTB', bol_m: true, bol_w: false, fields: benutzerdefiniert_fields },
    { id: D.SPRUNG_W, name: 'Sprung w', anzeigename: 'Sprung', kurzname: 'SPRNG', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'Benutzerdefiniert', sport: 'Turnen DTB', bol_m: false, bol_w: true, fields: benutzerdefiniert_fields },
    { id: D.STUFENBARREN, name: 'Stufenbarren', anzeigename: 'Stufenbarren', kurzname: 'STUBA', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/stufenbarren.png', formula: 'Benutzerdefiniert', sport: 'Turnen DTB', bol_m: false, bol_w: true, fields: benutzerdefiniert_fields },
    { id: D.SCHWEBEBALKEN, name: 'Schwebebalken', anzeigename: 'Schwebebalken', kurzname: 'BALKN', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/balken.png', formula: 'Benutzerdefiniert', sport: 'Turnen DTB', bol_m: false, bol_w: true, fields: benutzerdefiniert_fields },
    { id: D.BODEN_W, name: 'Boden w', anzeigename: 'Boden', kurzname: 'BODEN', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'Benutzerdefiniert', sport: 'Turnen DTB', bol_m: false, bol_w: true, fields: benutzerdefiniert_fields },
    { id: D.MINITRAMPOLIN, name: 'Minitrampolin', anzeigename: 'Minitrampolin', kurzname: 'MINIT', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/minitrampolin.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true, fields: [] },
    { id: D.GERAETEBAHN_A, name: 'Gerätebahn A', anzeigename: 'Gerätebahn A', kurzname: 'GBAHA', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/geraetebahn.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true, fields: [] },
    { id: D.GERAETEBAHN_B, name: 'Gerätebahn B', anzeigename: 'Gerätebahn B', kurzname: 'GBAHB', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/geraetebahn.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true, fields: [] },

    // === Level-Kategorien (14-20) ===
    { id: D.LK1, name: 'LK1', anzeigename: 'LK1', kurzname: 'LK1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: true, fields: [] },
    { id: D.LK2, name: 'LK2', anzeigename: 'LK2', kurzname: 'LK2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: true, fields: [] },
    { id: D.LK3, name: 'LK3', anzeigename: 'LK3', kurzname: 'LK3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: true, fields: [] },
    { id: D.AK, name: 'AK', anzeigename: 'AK', kurzname: 'AK', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'AK', sport: 'Turnen DTB', bol_m: true, bol_w: true, fields: [] },
    { id: D.KM, name: 'KM', anzeigename: 'KM', kurzname: 'KM', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true, fields: [] },
    { id: D.KM2, name: 'KM2', anzeigename: 'KM2', kurzname: 'KM2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true, fields: [] },
    { id: D.KM3, name: 'KM3', anzeigename: 'KM3', kurzname: 'KM3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true, fields: [] },

    // === Kür Geräte (21-28) ===
    { id: D.BODEN_M_KUER, name: 'Boden m. Kür', anzeigename: 'Boden', kurzname: 'BODEN', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.P_PFERD_KUER, name: 'P.-Pferd Kür', anzeigename: 'Pferd', kurzname: 'PFERD', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/seitpferd.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.RINGE_M, name: 'Ringe m.', anzeigename: 'Ringe', kurzname: 'RINGE', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/ringe.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.SPRUNG_M_KUER, name: 'Sprung m. Kür', anzeigename: 'Sprung', kurzname: 'SPRNG', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.PAR_BARREN_KUER, name: 'Par.-Barren Kür', anzeigename: 'Barren', kurzname: 'BARR', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/barren.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.RECK_M_KUER, name: 'Reck m. Kür', anzeigename: 'Reck', kurzname: 'RECK', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/reck.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.BODEN_W_KUER, name: 'Boden w. Kür', anzeigename: 'Boden', kurzname: 'BODEN', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB', bol_m: false, bol_w: true, fields: lk_fields },
    { id: D.SPRUNG_W_KUER, name: 'Sprung w. Kür', anzeigename: 'Sprung', kurzname: 'SPRNG', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB', bol_m: false, bol_w: true, fields: lk_fields },

    // === LK1 Geräte männlich (31-36) ===
    { id: D.BODEN_M_LK1, name: 'Boden m. LK1', anzeigename: 'Boden m. LK1', kurzname: 'BODL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.P_PFERD_LK1, name: 'P.-Pferd LK1', anzeigename: 'P.-Pferd LK1', kurzname: 'PFRL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/seitpferd.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.RINGE_LK1, name: 'Ringe LK1', anzeigename: 'Ringe LK1', kurzname: 'RINL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/ringe.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.SPRUNG_M_LK1, name: 'Sprung m. LK1', anzeigename: 'Sprung m. LK1', kurzname: 'SPRL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.PAR_BARREN_LK1, name: 'Par.-Barren LK1', anzeigename: 'Par.-Barren LK1', kurzname: 'PBRL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/barren.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.RECK_M_LK1, name: 'Reck m. LK1', anzeigename: 'Reck m. LK1', kurzname: 'REKL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/reck.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false, fields: lk_fields },
    // === LK1 Geräte weiblich (37-40) ===
    { id: D.SPRUNG_W_LK1, name: 'Sprung w. LK1', anzeigename: 'Sprung w. LK1', kurzname: 'SWRL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true, fields: lk_fields },
    { id: D.STUFENBARREN_LK1, name: 'Stufenbarren LK1', anzeigename: 'Stufenbarren LK1', kurzname: 'STBL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/stufenbarren.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true, fields: lk_fields },
    { id: D.SCHWEBEBALKEN_LK1, name: 'Schwebebalken LK1', anzeigename: 'Schwebebalken LK1', kurzname: 'BLKL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/balken.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true, fields: lk_fields },
    { id: D.BODEN_W_LK1, name: 'Boden w. LK1', anzeigename: 'Boden w. LK1', kurzname: 'BWDL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true, fields: lk_fields },

    // === LK2 Geräte männlich (41-46) ===
    { id: D.BODEN_M_LK2, name: 'Boden m. LK2', anzeigename: 'Boden m. LK2', kurzname: 'BODL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.P_PFERD_LK2, name: 'P.-Pferd LK2', anzeigename: 'P.-Pferd LK2', kurzname: 'PFRL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/seitpferd.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.RINGE_LK2, name: 'Ringe LK2', anzeigename: 'Ringe LK2', kurzname: 'RINL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/ringe.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.SPRUNG_M_LK2, name: 'Sprung m. LK2', anzeigename: 'Sprung m. LK2', kurzname: 'SPRL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.PAR_BARREN_LK2, name: 'Par.-Barren LK2', anzeigename: 'Par.-Barren LK2', kurzname: 'PBRL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/barren.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.RECK_M_LK2, name: 'Reck m. LK2', anzeigename: 'Reck m. LK2', kurzname: 'REKL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/reck.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false, fields: lk_fields },
    // === LK2 Geräte weiblich (47-50) ===
    { id: D.SPRUNG_W_LK2, name: 'Sprung w. LK2', anzeigename: 'Sprung w. LK2', kurzname: 'SWRL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true, fields: lk_fields },
    { id: D.STUFENBARREN_LK2, name: 'Stufenbarren LK2', anzeigename: 'Stufenbarren LK2', kurzname: 'STBL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/stufenbarren.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true, fields: lk_fields },
    { id: D.SCHWEBEBALKEN_LK2, name: 'Schwebebalken LK2', anzeigename: 'Schwebebalken LK2', kurzname: 'BLKL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/balken.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true, fields: lk_fields },
    { id: D.BODEN_W_LK2, name: 'Boden w. LK2', anzeigename: 'Boden w. LK2', kurzname: 'BWDL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true, fields: lk_fields },

    // === LK3 Geräte männlich (51-56) ===
    { id: D.BODEN_M_LK3, name: 'Boden m. LK3', anzeigename: 'Boden m. LK3', kurzname: 'BODL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.P_PFERD_LK3, name: 'P.-Pferd LK3', anzeigename: 'P.-Pferd LK3', kurzname: 'PFRL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/seitpferd.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.RINGE_LK3, name: 'Ringe LK3', anzeigename: 'Ringe LK3', kurzname: 'RINL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/ringe.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.SPRUNG_M_LK3, name: 'Sprung m. LK3', anzeigename: 'Sprung m. LK3', kurzname: 'SPRL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.PAR_BARREN_LK3, name: 'Par.-Barren LK3', anzeigename: 'Par.-Barren LK3', kurzname: 'PBRL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/barren.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false, fields: lk_fields },
    { id: D.RECK_M_LK3, name: 'Reck m. LK3', anzeigename: 'Reck m. LK3', kurzname: 'REKL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/reck.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false, fields: lk_fields },
    // === LK3 Geräte weiblich (57-60) ===
    { id: D.SPRUNG_W_LK3, name: 'Sprung w. LK3', anzeigename: 'Sprung w. LK3', kurzname: 'SWRL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true, fields: lk_fields },
    { id: D.STUFENBARREN_LK3, name: 'Stufenbarren LK3', anzeigename: 'Stufenbarren LK3', kurzname: 'STBL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/stufenbarren.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true, fields: lk_fields },
    { id: D.SCHWEBEBALKEN_LK3, name: 'Schwebebalken LK3', anzeigename: 'Schwebebalken LK3', kurzname: 'BLKL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/balken.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true, fields: lk_fields },
    { id: D.BODEN_W_LK3, name: 'Boden w. LK3', anzeigename: 'Boden w. LK3', kurzname: 'BWDL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true, fields: lk_fields },

    // === P-Geräte Sammelgeräte P1-P9 (61-70) ===
    { id: D.BODEN_M_P, name: 'Boden m. P1-P9', anzeigename: 'Boden m. P1-P9', kurzname: 'BODP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: true, bol_w: false, isP: true, fields: p_fields },
    { id: D.PAUSCHENPFERD_P, name: 'Pauschenpferd P1-P9', anzeigename: 'Pauschenpferd P1-P9', kurzname: 'PFERP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/seitpferd.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: true, bol_w: false, isP: true, fields: p_fields },
    { id: D.RINGE_P, name: 'Ringe P1-P9', anzeigename: 'Ringe P1-P9', kurzname: 'RINGP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/ringe.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: true, bol_w: false, isP: true, fields: p_fields },
    { id: D.SPRUNG_M_P, name: 'Sprung m. P1-P9', anzeigename: 'Sprung m. P1-P9', kurzname: 'SPRP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: true, bol_w: false, isP: true, fields: p_fields },
    { id: D.PAR_BARREN_P, name: 'Par.-Barren P1-P9', anzeigename: 'Par.-Barren P1-P9', kurzname: 'PBARP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/barren.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: false, bol_w: true, isP: true, fields: p_fields },
    { id: D.RECK_M_P, name: 'Reck m. P1-P9', anzeigename: 'Reck m. P1-P9', kurzname: 'RECKP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/reck.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: true, bol_w: false, isP: true, fields: p_fields },
    { id: D.SPRUNG_W_P, name: 'Sprung w. P1-P9', anzeigename: 'Sprung w. P1-P9', kurzname: 'SPRWP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: false, bol_w: true, isP: true, fields: p_fields },
    { id: D.RECK_STUBA_P, name: 'Reck/StuBa. P1-P9', anzeigename: 'Reck/StuBa. P1-P9', kurzname: 'RKSBP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/stufenbarren.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: false, bol_w: true, isP: true, fields: p_fields },
    { id: D.SCHWEBEBALKEN_P, name: 'Schwebebalken P1-P9', anzeigename: 'Schwebebalken P1-P9', kurzname: 'BALKP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/balken.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: false, bol_w: true, isP: true, fields: p_fields },
    { id: D.BODEN_W_P, name: 'Boden w. P1-P9', anzeigename: 'Boden w. P1-P9', kurzname: 'BODWP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: false, bol_w: true, isP: true, fields: p_fields },

    // === Turn10 Geräte (71-77) ===
    { id: D.TURN10, name: 'Turn10', anzeigename: 'Turn10', kurzname: 'TN10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true, fields: [] },
    { id: D.BODEN_TURN10, name: 'Boden Turn10® Basis', anzeigename: 'Boden Turn10® Basis', kurzname: 'BOD10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true, fields: turn10_fields },
    { id: D.BALKEN_BANK_TURN10, name: 'Balken/Bank Turn10® Basis', anzeigename: 'Balken/Bank Turn10® Basis', kurzname: 'BLK10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/balken.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true, fields: turn10_fields },
    { id: D.P_BARREN_TURN10, name: 'P-Barren Turn10® Basis', anzeigename: 'P-Barren Turn10® Basis', kurzname: 'PBR10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/barren.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true, fields: turn10_fields },
    { id: D.MINITRAMPOLIN_TURN10, name: 'Minitrampolin Turn10® Basis', anzeigename: 'Minitrampolin Turn10® Basis', kurzname: 'MNT10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/minitrampolin.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true, fields: turn10_fields },
    { id: D.RECK_STBARREN_TURN10, name: 'Reck/St-Barren Turn10® Basis', anzeigename: 'Reck/St-Barren Turn10® Basis', kurzname: 'RKS10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/reck.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true, fields: turn10_fields },
    { id: D.SPRUNG_TURN10, name: 'Sprung Turn10® Basis', anzeigename: 'Sprung Turn10® Basis', kurzname: 'SPR10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true, fields: turn10_fields },

    // === AK Geräte (78) ===
    { id: D.BODEN_AK, name: 'Boden AK', anzeigename: 'Boden AK', kurzname: 'BODAK', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'AK', sport: 'Turnen DTB', bol_m: true, bol_w: true, fields: ak_fields },
  ]
};

// ---- Write output ----
const outPath = path.join(__dirname, '..', 'src', 'data', 'json', 'gymnet-preset.json');
fs.writeFileSync(outPath, JSON.stringify(preset, null, 2), 'utf-8');
console.log(`✅ Generated ${outPath}`);
console.log(`   Formulas: ${preset.formulas.length}`);
console.log(`   Devices:  ${preset.devices.length}`);
console.log(`   Max ID:   ${preset.maxPresetDisciplineId}`);

// Verify IDs are unique
const ids = preset.devices.map(d => d.id);
const uniqueIds = new Set(ids);
if (ids.length !== uniqueIds.size) {
  console.error('❌ DUPLICATE IDs found!');
  process.exit(1);
}

// Verify all devices have fields array
const missingFields = preset.devices.filter(d => !Array.isArray(d.fields));
if (missingFields.length > 0) {
  console.error('❌ Devices missing fields:', missingFields.map(d => d.name));
  process.exit(1);
}

console.log('✅ All IDs unique, all devices have fields array');
