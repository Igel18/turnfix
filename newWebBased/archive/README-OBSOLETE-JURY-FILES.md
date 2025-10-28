# Archivierte Obsolete Jury Portal Dateien

## Datum: 28. Oktober 2025

Diese Dateien wurden archiviert, da sie durch das neue separate Jury Portal Projekt ersetzt wurden.

## Archivierte Dateien:

### 1. `dist-jury-obsolete/` (ehemals `client/dist-jury/`)
- **Beschreibung**: Build-Output des alten integrierten Jury Portals
- **Status**: Obsolet
- **Ersetzt durch**: `jury-portal/dist/` (separates Projekt)
- **Inhalt**: 
  - `index-jury.html` - Gebaute HTML-Datei
  - `assets/` - JavaScript und CSS Bundles

### 2. `index-jury-obsolete.html` (ehemals `client/index-jury.html`)
- **Beschreibung**: HTML Entry Point für das alte Jury Portal
- **Status**: Obsolet
- **Ersetzt durch**: `jury-portal/index.html`
- **Zweck**: War der Entry Point für die Vite-Build-Konfiguration

### 3. `vite.config.jury-obsolete.ts` (ehemals `client/vite.config.jury.ts`)
- **Beschreibung**: Vite-Konfiguration für das alte Jury Portal Build
- **Status**: Obsolet
- **Ersetzt durch**: `jury-portal/vite.config.ts`
- **Features**:
  - Build Output: `dist-jury`
  - Server Port: 5174
  - Entry Point: `index-jury.html`

## Entfernte package.json Scripts:

```json
"jury:dev": "vite --config vite.config.jury.ts --mode jury",
"jury:build": "tsc && vite build --config vite.config.jury.ts",
"jury:preview": "vite preview --config vite.config.jury.ts"
```

## Neues Setup:

Das Jury Portal läuft jetzt als **separates, unabhängiges Projekt**:

### Jury Portal (Frontend):
- **Pfad**: `jury-portal/`
- **Port**: 3002
- **Start**: `cd jury-portal && npm run dev`
- **Build**: `cd jury-portal && npm run build`
- **Features**:
  - Separates Vite-Projekt
  - Eigene Dependencies
  - Unabhängiges Deployment
  - Optimierte Performance

### Jury Server (Backend):
- **Pfad**: `jury-server/`
- **Port**: 3003
- **Start**: `cd jury-server && npm start`
- **Features**:
  - Dedicated API für Jury-Operationen
  - WebSocket-Support für Live-Updates
  - Unabhängig von Main-Server

## Vorteile des neuen Setups:

1. **Separation of Concerns**: Jury Portal ist komplett unabhängig
2. **Performance**: Kleinere Bundles, schnellere Builds
3. **Deployment**: Separate Deployments möglich
4. **Entwicklung**: Parallele Entwicklung ohne Konflikte
5. **Maintenance**: Einfachere Wartung durch klare Trennung

## Wiederherstellung:

Falls diese Dateien wieder benötigt werden:
1. Dateien aus `archive/` zurück nach `client/` verschieben
2. Scripts in `client/package.json` wieder hinzufügen
3. Build mit `npm run jury:build` ausführen

## Related Documentation:

- `JURY_PORTAL_COMPARISON.md` - Vergleich alt vs. neu
- `JURY_PORTAL_CONCEPT.md` - Konzept des neuen Jury Portals
- `POINT-46-JURY-PORTAL-ICONS.md` - Icons Implementation
- `jury-portal/README.md` - Jury Portal Dokumentation

## Point 88 aus Instructions.md:

> 88. Prio 5 Es gibt einen Ordner client/dist-jury/index-jury.html
> Dieser ist denke ich obsolet, da der richtige Jury portal über die ordner jury-portal und jury-server abgebildet werden.
> Bitte prüfen und ggf. archivieren.

**Status**: ✅ Geprüft und archiviert am 28.10.2025
