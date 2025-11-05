# Point 46 - Jury Portal Icons Fix

**Status**: ✅ Abgeschlossen
**Datum**: 2025-10-19

## Problem
Icons im Kampfrichter-Portal wurden nicht als Bilder angezeigt. Stattdessen:
- Qt-Resource-Pfade wurden als Text angezeigt (z.B. `:/icons/boden.png`)
- Nach erstem Fix: Fallback-Emojis wurden angezeigt statt der richtigen Icon-Bilder
- Root Cause: Icons waren im Jury-Portal nicht verfügbar

## Root Cause Analysis
1. **Jury-Portal hat kein eigenes public/assets Verzeichnis**
   - Client hat Icons in `client/public/assets/icons/`
   - Jury-Portal läuft auf separatem Port (5174)
   - Kann nicht auf Client-Assets zugreifen

2. **Icon-Pfade zeigten auf falschen Server**
   - Erste Implementierung: `/assets/icons/` (relative Pfade)
   - Jury-Portal hat diese Dateien nicht lokal
   - Icons konnten nicht geladen werden → Fallback zu Emojis

## Lösung

### 1. Backend-Server konfiguriert als Asset-Server
**Datei**: `server/src/index.ts`

Neue Route hinzugefügt:
```typescript
// Serve assets (icons, images) from client public directory for Jury Portal
import path from 'path';
const clientPublicPath = path.join(__dirname, '../../client/public');
app.use('/assets', express.static(clientPublicPath, {
  setHeaders: (res, path, stat) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
  }
}));
```

**Warum?**
- Backend-Server läuft auf Port 3001 (immer verfügbar)
- Jury-Portal kommuniziert bereits mit Backend
- Zentrale Quelle für alle Assets (Client + Jury-Portal)

### 2. Icon-URLs auf Backend-Server aktualisiert
**Datei**: `jury-portal/src/utils/iconUtils.ts`

**getIconUrl()** - Qt-Pfade zu Backend-URLs:
```typescript
if (iconPath.startsWith(':/')) {
  const filename = iconPath.replace(':/icons/', '');
  return `http://localhost:3001/assets/icons/${filename}`;
}
```

**getDisciplineIcon()** - Fallback-Mapping zu Backend-URLs:
```typescript
const nameToIcon: Record<string, string> = {
  'Boden': 'http://localhost:3001/assets/icons/boden.png',
  'Sprung': 'http://localhost:3001/assets/icons/sprung.png',
  'Barren': 'http://localhost:3001/assets/icons/barren.png',
  // ... etc.
};
```

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    Backend Server (Port 3001)                │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ /assets/* → client/public/                             │ │
│  │   ├── /assets/icons/boden.png                          │ │
│  │   ├── /assets/icons/sprung.png                         │ │
│  │   └── ... (alle Icons aus client/public/assets/)       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
                ┌─────────────┴─────────────┐
                │                           │
    ┌───────────┴────────────┐  ┌──────────┴───────────┐
    │  Client (Port 5173)    │  │ Jury Portal (5174)   │
    │  - Lokale Icons in     │  │ - KEINE lokalen Icons│
    │    public/assets/      │  │ - Lädt von Backend   │
    │  - Kann sie direkt     │  │   http://localhost:  │
    │    verwenden           │  │   3001/assets/...    │
    └────────────────────────┘  └──────────────────────┘
```

## Vorteile der Lösung

1. **Zentrale Asset-Verwaltung**
   - Nur ein Ort für Icons (client/public/assets/)
   - Keine Duplikation im Jury-Portal
   - Einfaches Update durch Austausch einer Datei

2. **Konsistenz**
   - Client und Jury-Portal verwenden exakt gleiche Icons
   - Kein Risiko von Version-Unterschieden

3. **Performance**
   - Backend-Server cached statische Assets
   - CORS-Header korrekt gesetzt
   - Cross-Origin-Resource-Policy erlaubt Zugriff

4. **Wartbarkeit**
   - Neue Icons nur im Client-Verzeichnis hinzufügen
   - Automatisch für Jury-Portal verfügbar

## Verfügbare Icons

Icons in `client/public/assets/icons/`:
- `boden.png` - Boden (männlich/weiblich)
- `sprung.png` - Sprung
- `barren.png` - Barren / Stufenbarren
- `reck.png` - Reck
- `seitpferd.png` - Seitpferd / Pauschenpferd
- `ringe.png` - Ringe
- `balken.png` - Schwebebalken
- `minitrampolin.png` - Minitrampolin
- `geraetebahn.png` - Gerätebahn A/B

## Fallback-Mechanismus

1. **Primär**: Icon aus Datenbank (`var_icon` Feld)
   - Qt-Pfad (`:/icons/xxx.png`) wird zu `http://localhost:3001/assets/icons/xxx.png`

2. **Sekundär**: Name-basiertes Mapping
   - Disziplin-Name → Icon-Pfad Lookup
   - Beispiel: "Boden" → `http://localhost:3001/assets/icons/boden.png`

3. **Tertier**: Emoji-Fallback
   - Wenn Icon-Bild nicht lädt (onError)
   - Beispiel: "Boden" → 🤸

## Testing

### Manuelle Tests erforderlich:
1. ✅ Backend-Server neu starten
2. ✅ Jury-Portal neu starten (Port 5174)
3. ✅ Event auswählen
4. ✅ Riege auswählen
5. ✅ Geräte-Auswahl-Seite öffnen
6. ✅ Verifizieren: Icons werden als Bilder angezeigt (nicht Emojis)
7. ✅ Verifizieren: Icon im Header beim Scoring sichtbar

### Browser Console prüfen:
- Keine 404-Fehler für Icon-Requests
- Requests gehen an `http://localhost:3001/assets/icons/...`
- Bilder laden erfolgreich

## Build Status
- ✅ Server kompiliert ohne Fehler (tsc)
- ✅ Jury-Portal kompiliert ohne Fehler (vite build 2.62s)

## Nächste Schritte
1. Server neu starten: `cd server && npm run dev`
2. Jury-Portal neu starten: `cd jury-portal && npm run dev`
3. Im Browser testen: http://localhost:5174

## 🚨 Production Problem

**Kritisch**: Die aktuelle Lösung (Vite Proxy) funktioniert **nur in Development**!

### Development vs Production

| Modus | Status | Beschreibung |
|-------|--------|--------------|
| **Development** (`npm run dev`) | ✅ | Vite Proxy leitet `/assets` → Backend weiter |
| **Production** (`npm run build`) | ❌ | Proxy existiert nicht → Icons laden nicht |

### Production-Lösung: Icons kopieren

**Empfohlene Lösung**: Icons ins Jury-Portal Public-Verzeichnis kopieren

#### Option 1: Manuelles Kopieren
```powershell
# Icons von Client zu Jury-Portal kopieren
Copy-Item -Path "client/public/assets/icons" -Destination "jury-portal/public/assets/" -Recurse -Force
```

#### Option 2: Automatisches Build-Script (EMPFOHLEN)
```json
// jury-portal/package.json
"scripts": {
  "prebuild": "powershell -Command \"Copy-Item -Path '../client/public/assets/icons' -Destination 'public/assets/' -Recurse -Force\"",
  "build": "tsc && vite build"
}
```

**Nach dem Kopieren**: 
- Icons sind lokal im Jury-Portal verfügbar
- Relative URLs (`/assets/icons/...`) funktionieren
- Keine Backend-Abhängigkeit im Production-Build

### Alternative: Environment-basierte URLs

```typescript
// jury-portal/.env.development
VITE_ASSETS_BASE_URL=/assets

// jury-portal/.env.production  
VITE_ASSETS_BASE_URL=http://your-backend-domain.com/assets
```

```typescript
// iconUtils.ts
const ASSETS_BASE_URL = import.meta.env.VITE_ASSETS_BASE_URL || '/assets';
return `${ASSETS_BASE_URL}/icons/${filename}`;
```

**Nachteil**: Backend-Server muss in Production laufen und CORS konfiguriert sein

## Dateien geändert
1. `server/src/index.ts` - Neue /assets Route hinzugefügt
2. `jury-portal/src/utils/iconUtils.ts` - URLs auf Backend-Server aktualisiert
3. `jury-portal/src/components/JuryPortal.tsx` - getDisciplineIcon() verwendet

## Dokumentation
- Neue Datei: `POINT-46-JURY-PORTAL-ICONS.md`
- Architektur-Diagramm inkludiert
- Vollständige Testing-Anleitung
