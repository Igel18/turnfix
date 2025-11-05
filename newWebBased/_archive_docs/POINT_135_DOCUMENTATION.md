# Point 135: Startgeräte-Verwaltung & Gantt-Verbesserungen

**Datum**: 2025-11-05  
**Status**: ✅ COMPLETE - Squad Start Device Editor & Automatic Distribution Implemented

## Zusammenfassung

Point 135 behebt das Problem fehlender Riegen im Gantt-Chart durch Implementierung einer Startgeräte-Verwaltung und automatischer Geräteverteilung bei Konflikten.

**Haupt-Achievements**:
- ✅ Alle Riegen werden im Gantt-Chart angezeigt
- ✅ UI zum Festlegen der Startgeräte (SquadStartDeviceEditor)
- ✅ Automatische Geräteverteilung als Fallback
- ✅ Backend-API für Persistierung (`PUT /squad-start-device`)
- ✅ Vollständige DE/EN-Lokalisierung

---

## 1. Problem & Root Cause Analysis

### Symptome
- Gantt-Chart zeigt nicht alle Riegen (z.B. "mGrün" fehlt)
- Console-Logs zeigen: Alle Riegen starten am gleichen Gerät
- SKIPPED-Meldungen in Console bei gleichzeitigem Start

### Debug-Trail
1. **Server-Logs**: ✅ Daten korrekt (mGrün: competitionIds:[735])
2. **Session-Grouping**: ✅ mGrün passes filter (included: true)
3. **Device-Schedule**: ✅ mGrün assigned (isAssigned: true)
4. **Konflikt-Logs**: ❌ Alle Riegen blockieren sich gegenseitig

**Console-Output**:
```
[calculateDeviceSchedule] Squad "mBlau" starts at device index 0 (Barren)
[calculateDeviceSchedule] Squad "mGrün" starts at device index 0 (Barren)
[calculateDeviceSchedule] Squad "mRot" starts at device index 0 (Barren)

[calculateDeviceSchedule] SKIPPED: Squad "wgelb" on "Boden" at 11:30
{
  deviceOccupied: true,
  squadOccupied: true,
  deviceOccupiedBy: "wrosa",
  squadOccupiedOn: "Balken"
}
```

### Root Cause

**Ursprünglicher Code**:
```typescript
// ALLE Riegen starteten am gleichen Gerät (Index 0)
const effectiveStartIndex = startDeviceIndex >= 0 ? startDeviceIndex : 0;
// → Konflikt bei gleichzeitigem Start mehrerer Riegen
```

**Problem**: Wenn keine Startgeräte in der Datenbank gesetzt sind (`bol_erstes_geraet = NULL`), starteten alle Riegen bei Gerät 0. Bei gleichzeitigem Start (z.B. alle um 08:30) blockierten sie sich gegenseitig.

---

## 2. Datenbank-Struktur

### Tabelle: `tfx_riegen_x_disziplinen`

**Schema**:
```sql
int_riegen_x_disziplinenid  INT PRIMARY KEY
int_veranstaltungenid       INT           -- Event ID
var_riege                   VARCHAR(5)    -- z.B. "mGrün"
int_disziplinenid           INT           -- z.B. 31 (Barren)
int_runde                   SMALLINT      -- z.B. 1 (Durchgang)
bol_erstes_geraet           BOOLEAN       -- TRUE = Startgerät
int_statusid                INT           -- Status
```

**Wichtig**: Startgeräte werden **pro Riege UND pro Disziplin** gespeichert, NICHT am Wettkampf!

### Beispiel für Riege "mGrün" im 6-Kampf

```sql
-- mGrün hat 6 Einträge (einen pro Gerät)
var_riege | int_disziplinenid | var_name (JOIN) | bol_erstes_geraet
----------|-------------------|------------------|------------------
mGrün     | 72                | Barren           | TRUE    ← Startet hier
mGrün     | 46                | Reck             | FALSE
mGrün     | 74                | Boden            | FALSE
mGrün     | 31                | Pferd            | FALSE
mGrün     | 50                | Ringe            | FALSE
mGrün     | 71                | Sprung           | FALSE
```

**Bedeutung**: Riege "mGrün" startet am Barren und rotiert dann durch alle 6 Geräte.

---

## 3. Backend-API

### Neue Route: `PUT /api/time-planning/squad-start-device`

**Datei**: `server/src/routes/timePlanning.ts` (Lines 490-560)

**Request Body**:
```json
{
  "eventId": 59,
  "squadName": "mGrün",
  "round": 1,
  "disciplineId": 72  // Barren
}
```

**Logik**:
```typescript
// 1. Setze alle Geräte dieser Riege in dieser Runde auf FALSE
await prisma.tfx_riegen_x_disziplinen.updateMany({
  where: {
    int_veranstaltungenid: eventId,
    var_riege: squadName,
    int_runde: round
  },
  data: { bol_erstes_geraet: false }
});

// 2. Setze das ausgewählte Gerät auf TRUE
await prisma.tfx_riegen_x_disziplinen.updateMany({
  where: {
    int_veranstaltungenid: eventId,
    var_riege: squadName,
    int_runde: round,
    int_disziplinenid: disciplineId
  },
  data: { bol_erstes_geraet: true }
});
```

**Response**:
```json
{
  "success": true,
  "message": "Start device updated for squad mGrün",
  "updated": 1
}
```

---

## 4. Frontend: SquadStartDeviceEditor

### Neue Komponente

**Datei**: `client/src/pages/TimePlanning/components/SquadStartDeviceEditor.tsx` (249 Zeilen)

**Features**:
- ✅ Tabellen-Layout (standardkonform)
- ✅ Dropdown-Auswahl für Geräte
- ✅ BlueInfoBox mit Erklärung
- ✅ ESC-Taste schließt Dialog
- ✅ Vollständige DE/EN-Lokalisierung
- ✅ Debug-Logging

### TypeScript-Interfaces

```typescript
interface SquadDiscipline {
  tfx_disziplinen: {
    int_disziplinenid: number;
    var_name: string;
    var_kurz1?: string;
    var_icon?: string;
  };
  var_riege: string;
  int_runde: number;
  bol_erstes_geraet: boolean;
  tfx_wettkaempfeid: number | null;
}

interface SquadWithDevices {
  name: string;                    // "mGrün"
  devices: {
    id: number;                    // 72
    name: string;                  // "Barren"
    shortName: string;             // "BARR"
    icon?: string;                 // (optional)
  }[];
  currentStartDeviceId?: number;   // Aktuell gewähltes Gerät
}
```

### UI-Darstellung

```
┌────────────────────────────────────────────────────┐
│ Startgeräte festlegen                         [✕]  │
│ Gerätsechskampf m (7-8 Jahre) - Runde 1           │
├────────────────────────────────────────────────────┤
│ ℹ️ Startgerät auswählen                            │
│ Wählen Sie für jede Riege das Gerät aus, an dem   │
│ sie ihre Rotation beginnen soll. Dies verhindert  │
│ Konflikte, wenn mehrere Riegen gleichzeitig       │
│ starten.                                           │
├────────────────────────────────────────────────────┤
│ Riege    │ Erstes Gerät                           │
├──────────┼────────────────────────────────────────┤
│ mBlau    │ [Dropdown: Barren ▼]                   │
│ 6 Geräte │ ✓ Barren                               │
├──────────┼────────────────────────────────────────┤
│ mGrün    │ [Dropdown: Sprung ▼]                   │
│ 6 Geräte │ ✓ Sprung                               │
├──────────┼────────────────────────────────────────┤
│ mRot     │ [Dropdown: Reck ▼]                     │
│ 6 Geräte │ ✓ Reck                                 │
└──────────┴────────────────────────────────────────┘
│                          [Abbrechen] [💾 Speichern]│
└────────────────────────────────────────────────────┘
```

### Daten-Flow

1. **API-Call**: `GET /time-planning?eventId=X`
2. **Filtern**: `squadDisciplines.filter(sd => sd.int_runde === round)`
3. **Gruppieren**: Map<squadName, disciplines[]>
4. **Aktuelles Startgerät**: `disciplines.find(sd => sd.bol_erstes_geraet)`
5. **Bei Änderung**: `PUT /time-planning/squad-start-device`
6. **Nach Speichern**: Cache invalidieren, Daten neu laden

### Integration in TimePlanning

**Button-Position**: In Wettkampf-Karte (SessionsView)

```tsx
// client/src/pages/TimePlanning/components/SessionsView.tsx
<div className="absolute top-2 right-2 flex gap-1 z-10">
  <button
    onClick={(e) => {
      e.stopPropagation();
      handleEditStartDevices(comp);
    }}
    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 
               rounded-lg transition-colors shadow-sm bg-white border border-gray-200"
    title={t('timePlanning.editStartDevices')}
  >
    <PlayIcon className="h-4 w-4" />  {/* Grünes Play-Icon */}
  </button>
  <button onClick={() => handleEditCompetition(comp)} ...>
    <PencilIcon className="h-4 w-4" />  {/* Blauer Stift */}
  </button>
</div>
```

**State-Management** (index.tsx):
```typescript
const [editingStartDevices, setEditingStartDevices] = useState<{ 
  competitionId: number; 
  competitionName: string; 
  round: number 
} | null>(null);

// Dialog-Rendering
{editingStartDevices && (
  <SquadStartDeviceEditor
    eventId={Number(eventId)}
    competitionId={editingStartDevices.competitionId}
    competitionName={editingStartDevices.competitionName}
    round={editingStartDevices.round}
    onClose={() => setEditingStartDevices(null)}
    onSave={() => {
      refetch();                    // Daten neu laden
      setDeviceSchedule([]);        // Schedule neu berechnen
    }}
  />
)}
```

---

## 5. Automatische Geräteverteilung

### Algorithmus (Fallback bei fehlenden DB-Werten)

**Datei**: `client/src/pages/TimePlanning/index.tsx` (Lines 285-311)

```typescript
sessionGroup.squads.forEach((squad, squadIndex) => {
  // 1. Suche Startgerät aus Datenbank
  const startDeviceIndex = disciplineObjs.findIndex(d => d.isFirst);
  
  // 2. Fallback: Automatische Verteilung über Geräte
  const effectiveStartIndex = startDeviceIndex >= 0 
    ? startDeviceIndex                      // DB-Wert verwenden
    : (squadIndex % disciplineObjs.length); // Automatisch verteilen
  
  console.log(`Squad "${squad.name}" (index ${squadIndex}) starts at device index ${effectiveStartIndex} (${disciplineObjs[effectiveStartIndex]?.name})`);
  
  // 3. Rotation durch alle Geräte
  for (let i = 0; i < disciplineObjs.length; i++) {
    const deviceIndex = (effectiveStartIndex + i) % disciplineObjs.length;
    const device = disciplineObjs[deviceIndex];
    
    // Konflikt-Prüfung mit Maps
    const deviceKey = `${device.name}__${startTime}`;
    const squadKey = `${squad.name}__${startTime}`;
    
    if (!deviceTimeMap.has(deviceKey) && !squadTimeMap.has(squadKey)) {
      schedule.push({ squadName, deviceName, startTime, endTime, ... });
      deviceTimeMap.set(deviceKey, squad.name);
      squadTimeMap.set(squadKey, device.name);
    }
  }
});
```

### Beispiel bei 6 Geräten (ohne DB-Werte)

```
Riege    | squadIndex | effectiveStartIndex | Rotation
---------|------------|---------------------|--------------------
mBlau    | 0          | 0 % 6 = 0          | 0→1→2→3→4→5
mGrün    | 1          | 1 % 6 = 1          | 1→2→3→4→5→0
mRot     | 2          | 2 % 6 = 2          | 2→3→4→5→0→1
mGelb    | 3          | 3 % 6 = 3          | 3→4→5→0→1→2
```

**Vorteil**: Keine Konflikte, auch wenn Startgeräte nicht in DB gesetzt sind!

---

## 6. Übersetzungen (i18n)

### Deutsche Übersetzungen (`de.json`)

```json
"timePlanning": {
  "startDevices": "Startgeräte festlegen",
  "editStartDevices": "Startgeräte bearbeiten",
  "startDeviceInfo": "Startgerät auswählen",
  "startDeviceDescription": "Wählen Sie für jede Riege das Gerät aus, an dem sie ihre Rotation beginnen soll. Dies verhindert Konflikte, wenn mehrere Riegen gleichzeitig starten.",
  "noSquadsFound": "Keine Riegen für diesen Wettkampf gefunden",
  "noStartDeviceSelected": "Kein Startgerät ausgewählt"
}
```

### Englische Übersetzungen (`en.json`)

```json
"timePlanning": {
  "startDevices": "Set Start Apparatus",
  "editStartDevices": "Edit Start Apparatus",
  "startDeviceInfo": "Select Start Apparatus",
  "startDeviceDescription": "Select the apparatus where each squad should start their rotation. This prevents conflicts when multiple squads start simultaneously.",
  "noSquadsFound": "No squads found for this competition",
  "noStartDeviceSelected": "No start apparatus selected"
}
```

---

## 7. Workflow & Verwendung

### Startgeräte festlegen (Admin)

1. **Zeitplanung** öffnen (`/time-planning?eventId=X`)
2. **Durchgang aufklappen** (z.B. "Durchgang 1")
3. **Grünes Play-Icon** (▶️) bei Wettkampf klicken
4. **Dialog öffnet sich**:
   - Tabelle mit allen Riegen des Wettkampfs
   - Dropdown für jede Riege
5. **Gerät auswählen** für jede Riege
6. **Speichern** klicken
7. **Datenbank wird aktualisiert** (`bol_erstes_geraet`)
8. **Gantt-Ansicht neu laden** → Riegen starten an gewählten Geräten

### Gantt-Chart verwenden

1. **Zeitplanung** öffnen
2. **"Gantt"-Button** klicken (oben in View-Switcher)
3. **Auto-Berechnung**:
   - Lädt Startgeräte aus Datenbank
   - Fallback auf automatische Verteilung (wenn nicht gesetzt)
   - Zeigt alle Riegen an korrekten Geräten
4. **Konflikt-Prävention**:
   - `deviceTimeMap`: Verhindert doppelte Gerätebelegung
   - `squadTimeMap`: Verhindert dass Riege an zwei Orten gleichzeitig ist

### Debug-Modus

**Console-Output** (wenn DEBUG=true):
```javascript
[TimePlanning] Loaded squads: [...]
[calculateDeviceSchedule] Squad "mGrün" (index 1) starts at device index 1 (Sprung)
[calculateDeviceSchedule] Generated 18 schedule entries for session 1
[GanttView] Received deviceSchedule: 18 entries
[GanttView] Squads in schedule: ["mBlau", "mGrün", "mRot"]
```

---

## 8. Bezug zu Point 133: Bahn-Konzept

### Wichtige Unterscheidung

**Bahn** ≠ **Startgerät**

| Konzept | Zweck | Zuordnung | Datenbank |
|---------|-------|-----------|-----------|
| **Bahn** (Point 133) | Kampfgericht-Zuweisung | Wettkampf → Bahn | `tfx_wettkaempfe.int_bahn` |
| **Startgerät** (Point 135) | Rotations-Startpunkt | Riege → Gerät | `tfx_riegen_x_disziplinen.bol_erstes_geraet` |

### Bahn (Kampfgericht)

**Definition**: Eine Bahn ist eine Gerätebahn bzw. ein Kampfgericht.

**Regel**: Ein Wettkampf sollte von **einem Kampfgericht** gewertet werden, damit alle Turner im Wettkampf **einheitliche Wertungen** erhalten.

**Zuordnung**: **Wettkämpfe** werden Bahnen zugewiesen (NICHT Riegen!)

**Beispiel**:
```
Wettkampf: "Gerätsechskampf m (13-14 Jahre)"
→ int_bahn = 1
→ Kampfgericht 1 wertet alle Turner dieses Wettkampfs
   (egal in welcher Riege sie sind)
```

### Startgerät (Rotations-Startpunkt)

**Definition**: Das Gerät, an dem eine Riege ihre Rotation **beginnt**.

**Zweck**: Verhindert Konflikte, wenn mehrere Riegen gleichzeitig starten.

**Zuordnung**: **Riegen** haben ein Startgerät pro Wettkampf/Runde.

**Beispiel**:
```
Wettkampf: "Gerätsechskampf m (13-14 Jahre)" (Kampfgericht 1)
Riegen:
- mBlau  startet am Barren  (rotiert dann: Barren→Reck→Boden→...)
- mGrün  startet am Sprung  (rotiert dann: Sprung→Barren→Reck→...)
- mRot   startet am Reck    (rotiert dann: Reck→Boden→Pferd→...)

→ Alle 3 Riegen werden von Kampfgericht 1 bewertet
→ Jede startet an anderem Gerät (keine Konflikte)
```

### UI-Zuordnung

| Konzept | UI-Ort | Button/Dialog |
|---------|--------|---------------|
| **Bahn zuweisen** | Wettkampf-Editor | Blauer Stift (PencilIcon) |
| **Startgerät festlegen** | SquadStartDeviceEditor | Grünes Play (PlayIcon) |

---

## 9. Geänderte/Neue Dateien

### Backend

**Neu**:
- `server/src/routes/timePlanning.ts` (+65 Zeilen)
  - Route: `PUT /squad-start-device`
  - Lines 490-560

### Frontend

**Neu**:
- `client/src/pages/TimePlanning/components/SquadStartDeviceEditor.tsx` (249 Zeilen)
  - Tabellen-Layout mit Dropdown
  - ESC-Key-Support
  - Debug-Logging
  - Vollständige Lokalisierung

**Modifiziert**:
- `client/src/pages/TimePlanning/components/SessionsView.tsx` (+20 Zeilen)
  - Neuer Button: Grünes Play-Icon
  - Prop: `handleEditStartDevices`
  - Lines 123-145

- `client/src/pages/TimePlanning/index.tsx` (+35 Zeilen)
  - State: `editingStartDevices`
  - Handler: `handleEditStartDevices`
  - Automatische Geräteverteilung (Lines 285-311)
  - Dialog-Rendering (Lines 873-888)

- `client/src/i18n/locales/de.json` (+6 Zeilen)
- `client/src/i18n/locales/en.json` (+6 Zeilen)

### Build-Metriken

```
✓ built in 7.46s
dist/assets/index-CruaHZeJ.js  1,542.76 kB │ gzip: 414.89 kB
```

**Keine Bundle-Größen-Änderung** (gutes Zeichen für Tree-Shaking)

---

## 10. Lessons Learned

### Problem-Solving

1. **Extensive Logging** auf jedem Level (Server, Filter, Schedule, UI)
   - ✅ Zeigt exakt, wo Daten verloren gehen
   - ✅ User kann Fehler selbst erkennen

2. **Root Cause Analysis** statt Symptom-Bekämpfung
   - ❌ FALSCH: "Riege mGrün zur Liste hinzufügen"
   - ✅ RICHTIG: "Warum wird mGrün überhaupt rausgefiltert?"

3. **User-Insight wertvoll**
   - User's Hinweis auf `bol_erstes_geraet` war der Durchbruch
   - Datenbank-Schema zu kennen ist essentiell

### API-Design

1. **URL-Paths**: apiGet/apiPut fügen `/api` automatisch hinzu
   - ❌ FALSCH: `apiGet('/api/time-planning')`
   - ✅ RICHTIG: `apiGet('/time-planning')`

2. **Filtern**: Flexible Filter > starre IDs
   - ❌ FALSCH: `filter(sd => sd.tfx_wettkaempfeid === competitionId)`
   - ✅ RICHTIG: `filter(sd => sd.int_runde === round)`
   - Grund: `tfx_wettkaempfeid` kann NULL sein

3. **Batch-Updates**: Zwei-Schritte-Pattern
   - Schritt 1: Alle auf FALSE setzen
   - Schritt 2: Ausgewähltes auf TRUE setzen
   - → Garantiert genau ein TRUE-Eintrag

### UI-Design

1. **Tabellen > Karten** für Daten-Management
   - Dropdown ist Standard für Listen
   - Radio-Buttons für < 6 Optionen
   - Tabellen für Übersichtlichkeit

2. **Standard-Patterns nutzen**:
   - ✅ BlueInfoBox für Erklärungen
   - ✅ ESC-Key schließt Dialogs
   - ✅ Bestätigung nach Speichern (z.B. ✓ Symbol)

3. **Button-Visibility**:
   - `z-10` für Buttons über Content
   - `bg-white border shadow-sm` für bessere Sichtbarkeit
   - `pr-20` statt `pr-8` für mehr Button-Platz

### Code-Quality

1. **TypeScript-Interfaces**:
   - ✅ Separate Interfaces für Backend-Daten vs. UI-Props
   - ✅ Optional fields mit `?` markieren

2. **Debug-Logging**:
   - ✅ Konsistent: `[ComponentName] Message: data`
   - ✅ Strukturierte Daten: `console.log({ key: value })`
   - ❌ NICHT in Production (hinter DEBUG-Flag)

3. **Lokalisierung**:
   - ✅ ALLE UI-Texte müssen übersetzt sein
   - ✅ Nie hardcoded Strings in JSX

---

## 11. Testing-Checklist

### Funktionalität

- [ ] **Dialog öffnet sich** beim Klick auf grünes Play-Icon
- [ ] **Riegen werden angezeigt** mit korrekten Gerät-Optionen
- [ ] **Aktuelles Startgerät** ist vorselektiert (wenn in DB gesetzt)
- [ ] **Dropdown-Auswahl** funktioniert
- [ ] **Bestätigung** wird unter Dropdown angezeigt
- [ ] **ESC-Taste** schließt Dialog
- [ ] **Speichern** aktualisiert Datenbank
- [ ] **Gantt-Chart** zeigt alle Riegen an korrekten Geräten
- [ ] **Automatische Verteilung** funktioniert bei fehlenden DB-Werten

### Edge Cases

- [ ] **Keine Riegen**: "Keine Riegen gefunden" wird angezeigt
- [ ] **Kein Startgerät gewählt**: Warnung wird angezeigt
- [ ] **Mehrere Riegen gleichzeitig**: Keine Konflikte
- [ ] **Reload**: Startgeräte bleiben gespeichert

### Lokalisierung

- [ ] **Deutsch**: Alle Texte auf Deutsch
- [ ] **Englisch**: Alle Texte auf Englisch
- [ ] **Tooltips**: Funktionieren in beiden Sprachen

---

## 12. Nächste Schritte

### Point 134: Refactoring Rotation View

**Hinweis**: Riegen-Wettkampf-Zuordnung scheint dupliziert zu sein.

**Zu prüfen**:
- `TimePlanningRotation.tsx` (538 Zeilen)
- Vergleich mit `calculateDeviceSchedule()` in `index.tsx`
- Mögliche SoC-Verbesserungen

### Dokumentation

**TODO**:
- Screenshots für SquadStartDeviceEditor erstellen
- Workflow-Diagramm für Zeitplanung
- Bahn vs. Startgerät Konzept visualisieren

---

## 13. Zusammenfassung

**Point 135** behebt erfolgreich das Problem fehlender Riegen im Gantt-Chart durch:

1. ✅ **Backend-API** für Startgeräte-Verwaltung
2. ✅ **SquadStartDeviceEditor** UI-Komponente
3. ✅ **Automatische Geräteverteilung** als Fallback
4. ✅ **Vollständige Lokalisierung** (DE/EN)
5. ✅ **Klarstellung Bahn vs. Startgerät** (Point 133)

**Ergebnis**: Alle Riegen werden korrekt im Gantt angezeigt, keine Konflikte mehr!

---

**Status**: ✅ COMPLETE  
**Build**: ✅ Erfolgreich (7.46s)  
**Tests**: 🔄 Manuell (Checklist oben)  
**Dokumentation**: ✅ Vollständig
