# Teilnehmer-Verwaltung Anforderungen

**Datum**: 13.11.2025  
**Version**: 1.0  
**Status**: Dokumentiert, Umsetzung ausstehend

---

## Status-Legende

| Symbol | Bedeutung |
|--------|-----------|
| ✅ | **Muss implementiert werden** - Feature ist geplant, aber noch nicht vorhanden |
| ✔️ | **Bereits vorhanden** - Feature ist implementiert und funktioniert |
| ❌ | **Nicht benötigt** - Feature wird für diesen Typ nicht verwendet |
| ⏳ | **In Arbeit** - Feature wird gerade implementiert |

---

## Übersicht

Es gibt drei verschiedene Arten von Teilnehmern mit unterschiedlichen Verwaltungsanforderungen:

1. **Einzelteilnehmer** (Individual Participants)
2. **Gruppen** (Groups) - für TeamGym
3. **Mannschaften** (Teams) - für Mannschaftswettkämpfe

---

## Point 155: Einzelteilnehmer verwalten

### Anforderung
Zusätzliche UI um Teilnehmer dem Event hinzuzufügen, analog zu Riegen-Verwaltung.

### Funktionen

#### Filter-Optionen
- ✅ **Button: "Verplante Teilnehmer ausblenden"**
  - Blendet Teilnehmer aus, die bereits in Wettkämpfen verplant sind
  - Verhindert Doppel-Zuweisungen
  - Entspricht `ui->chk_planned` aus C++ Code

#### Workflow
1. Teilnehmer zum Event hinzufügen
2. Teilnehmer werden **direkt den Wettkämpfen zugewiesen**
   - Keine separate Zuweisung nötig
   - Streamlined Workflow

### Technische Umsetzung
- **Neue UI**: Event Participants mit direkter Wettkampf-Zuweisung
- **Bestehend**: `/event-participants` (erweitern)
- **Filter**: `tfx_wertungen` JOIN `tfx_wettkaempfe` WHERE `int_veranstaltungenid`

---

## Point 156: Gruppen verwalten

### Anforderung
Beim Hinzufügen einer Gruppe zum Event können direkt Mitglieder hinzugefügt werden (wie bei Squads).

### Funktionen

#### Filter-Optionen
- ✅ **Button: "Verplante Teilnehmer ausblenden"**
  - Blendet Teilnehmer aus, die bereits in Gruppen-Wertungen des Events sind
  - Entspricht `ui->chk_planned` aus `groupdialog.cpp`
  
- ✅ **Button: "Andere Vereine ausblenden"**
  - Zeigt nur Teilnehmer vom gleichen Verein wie die Gruppe
  - Entspricht `ui->chk_club` aus `groupdialog.cpp`

#### Workflow
1. Gruppe erstellen/auswählen
2. Mitglieder direkt hinzufügen (Assignment Pattern wie Squads)
3. Filter anwenden für bessere Übersicht

### Legacy-Kompatibilität
**Referenz**: `participants/groupdialog.cpp`
```cpp
// Zeile 370: Filter für verplante Teilnehmer
WHERE int_veranstaltungenid=? 
AND int_teilnehmerid NOT IN (
    SELECT int_teilnehmerid FROM tfx_wertungen 
    INNER JOIN tfx_wettkaempfe USING (int_wettkaempfeid) 
    WHERE int_veranstaltungenid=? 
    AND int_gruppenid != ?
)
```

### Technische Umsetzung
- **Bestehend**: `/groups` (erweitern)
- **Neu**: Filter-Buttons in UI
- **Hook**: `useGroupMembers` erweitern mit Filter-Parametern

---

## Point 157: Mannschaften verwalten

### Anforderung
Beim Hinzufügen einer Mannschaft zum Event können direkt Mitglieder hinzugefügt werden (wie bei Squads).

### Funktionen

#### Filter-Optionen
- ✅ **Button: "Verplante Teilnehmer ausblenden"**
  - Blendet Teilnehmer aus, die bereits in Mannschafts-Wertungen des Events sind
  
- ✅ **Button: "Andere Vereine ausblenden"**
  - Zeigt nur Teilnehmer vom gleichen Verein wie die Mannschaft

#### Zusätzliche Felder (Mannschaftsmitglieder)
- ✅ **AK (Außer Konkurrenz)** - Checkbox
  - **Immer angezeigt**, optional zum Aktivieren
  - Markiert, ob Teilnehmer außer Konkurrenz startet (Wertung zählt nicht für Platzierung)
  - Entspricht `bol_ak` in `tfx_wertungen` (Boolean)
  - Default: unchecked (false)
  
- ✅ **SN (Startet Nicht)** - Checkbox
  - **Immer angezeigt**, optional zum Aktivieren
  - Markiert, ob Teilnehmer nicht startet (z.B. verletzt, abwesend)
  - Entspricht `bol_startet_nicht` in `tfx_wertungen` (Boolean)
  - Default: unchecked (false)
  
**Hinweis**: Die eigentliche Startnummer wird automatisch vergeben (`int_startnummer`), nicht manuell gesetzt.

#### Wettkampf-Zuweisung
- ✅ **Bei neuer Mannschaft: Wettkampf direkt auswählen**
  - Dropdown/Select für Wettkampf-Auswahl
  - Mannschaft wird sofort mit Wettkampf verknüpft
  - Entspricht `ui->cmb_wk` aus C++ Code
  - **Wettkampf kann später geändert werden**
  - Achtung: Bei Wettkampf-Änderung bestehende Wertungen berücksichtigen

### Workflow
1. Neue Mannschaft erstellen
2. **Wettkampf auswählen** (Dropdown)
3. Mitglieder hinzufügen
4. Für jedes Mitglied: 
   - **AK** aktivieren (falls außer Konkurrenz)
   - **SN** aktivieren (falls nicht startend)
5. Filter nutzen für bessere Übersicht
6. **Startnummern werden automatisch vergeben** (siehe unten)

#### Automatische Startnummer-Vergabe

**Referenz**: `teamdialog.cpp` Zeile 235-236
```cpp
query20.prepare("SELECT MAX(int_startnummer) FROM tfx_wertungen ... WHERE int_veranstaltungenid=? AND int_runde=?");
query7.bindValue(6, (query20.value(0).toInt()+1) );  // Auto-increment
```

**Logik**:
1. Beim Hinzufügen eines Mannschaftsmitglieds zur Wertung
2. System findet höchste bestehende Startnummer im Event + Runde
3. Neue Startnummer = MAX(int_startnummer) + 1
4. **NICHT manuell editierbar** in der UI

**Wichtig**: Die Checkboxen **AK** und **SN** sind **nicht** für Startnummern!
- **AK** = Außer Konkurrenz (Wertung zählt nicht)
- **SN** = Startet Nicht (Teilnehmer abwesend/verletzt)

### Technische Umsetzung
- **Bestehend**: `/teams` (erweitern)
- **Neu**: 
  - Filter-Buttons
  - AK/SN Checkboxen pro Mitglied
  - Wettkampf-Dropdown bei Team-Erstellung
- **Hook**: `useTeamMembers` erweitern

### Legacy-Referenz (C++ Code)

**Datei**: `participants/teamdialog.cpp`

**Tabellen-Header** (Zeile 63):
```cpp
QString headers[6] = {"StNr.","Name","Geb.","AK","SN","id"};
```
- Spalte 0: Startnummer (automatisch vergeben)
- Spalte 1: Name
- Spalte 2: Geburtsdatum
- Spalte 3: **AK** Checkbox (`bol_ak`)
- Spalte 4: **SN** Checkbox (`bol_startet_nicht`)
- Spalte 5: ID (hidden)

**Checkbox-Logik** (Zeile 345-368):
```cpp
QStandardItem *itak = new QStandardItem();  // AK Checkbox
QStandardItem *itks = new QStandardItem();  // SN Checkbox
// ... Query: SELECT bol_ak, bol_startet_nicht FROM tfx_wertungen ...
itak->setCheckable(true);
model->setItem(i,3,itak);  // Column 3 = AK
itks->setCheckable(true);
model->setItem(i,4,itks);  // Column 4 = SN
```

---

## Point 159: Gruppen-Leistung

### Anforderung
Bei Gruppen gibt es **nur eine gemeinsame Leistungsbewertung**, keine individuellen Bewertungen der einzelnen Personen.

### Eigenschaften
- ✅ **Gruppenbewertung**: Eine Wertung für die gesamte Gruppe
- ❌ **KEINE Einzelbewertungen**: Mitglieder werden nicht individuell bewertet
- 📊 **Score-Komponenten**: D/E/A-Noten für die Gruppe als Einheit

### Datenbank
```sql
tfx_wertungen:
  int_gruppenid      -- Referenz zur Gruppe
  int_teilnehmerid   -- NULL (keine Einzelperson)
  int_mannschaftenid -- NULL
```

### UI-Implementierung
- **GroupScoreCapture.tsx** (bereits erstellt)
- Zeigt: Gruppe auswählen → Wertung eingeben
- Keine Einzelpersonen-Auswahl nötig

---

## Point 160: Mannschaften-Leistung

### Anforderung
Bei Mannschaften gibt es **einzelne Bewertungen der Personen**, nicht nur eine Team-Bewertung.

### Eigenschaften
- ✅ **Individuelle Bewertungen**: Jedes Mannschaftsmitglied wird einzeln bewertet
- ✅ **Mannschafts-Kontext**: Bewertungen gehören zur Mannschaft
- 📊 **Score-Komponenten**: D/E/A-Noten pro Person
- 🔢 **Aggregation**: Mannschafts-Endergebnis = Summe aller Wertungen

### Mannschafts-Ergebnis Berechnung

#### Wettkampf-Konfiguration
Jeder Mannschafts-Wettkampf hat zwei wichtige Felder:

1. **"Wertungen"** (Anzahl der zählenden Wertungen)
   - **NEU**: Dieses Feld muss bei Mannschafts-Wettkämpfen verfügbar sein
   - Definiert: Wie viele Wertungen fließen ins Endergebnis ein
   - Beispiel: "5" = die besten 5 Wertungen zählen
   - Entspricht vermutlich neuem Feld oder bestehend in `tfx_wettkaempfe`

2. **"Die kleinsten X Wertungen streichen"** (`int_anz_streich`)
   - **Bestehendes Feld** in `tfx_wettkaempfe`
   - Definiert: Wie viele der schlechtesten Wertungen gestrichen werden
   - Beispiel: "1" = die schlechteste Wertung wird gestrichen

#### Berechnungsformel

**Wichtig**: Die Felder `int_wertungen` und `int_anz_streich` arbeiten **zusammen**!

**Standard-Berechnung** (wenn `int_wertungen` = 0 oder NULL):
```
Mannschafts-Endergebnis = Summe aller Wertungen der Mannschaft
```

**Mit Wertungs-Limit** (`int_wertungen` > 0):
```
1. Alle Wertungen der Mannschaft sammeln
2. Nach Punktzahl sortieren (höchste zuerst)
3. Die besten N Wertungen auswählen (int_wertungen)
4. Diese N Wertungen addieren
5. Mannschafts-Endergebnis = Summe
```

**Mit Streichwertung** (`int_anz_streich` > 0 UND `bol_streichwertung` = true):
```
1. Alle Wertungen der Mannschaft sammeln
   (oder: die besten N, falls int_wertungen gesetzt)
2. Nach Punktzahl sortieren (höchste zuerst)
3. Die kleinsten X Wertungen streichen (int_anz_streich)
4. Die verbleibenden Wertungen addieren
5. Mannschafts-Endergebnis = Summe
```

**Kombination beider Felder**:
```
1. Alle Wertungen der Mannschaft sammeln
2. Nach Punktzahl sortieren (höchste zuerst)
3. Falls int_wertungen > 0: Die besten N auswählen
4. Falls bol_streichwertung = true: Von diesen N die kleinsten X streichen
5. Mannschafts-Endergebnis = Summe der verbleibenden Wertungen
```

#### Beispiel-Szenarien

**Szenario 1: Einfache Addition**
- Mannschaft hat 6 Mitglieder mit Wertungen: 14.5, 13.8, 14.2, 13.5, 14.0, 13.9
- Feld "Wertungen": 6 (alle zählen)
- `int_anz_streich`: 0 (keine Streichung)
- **Endergebnis**: 14.5 + 13.8 + 14.2 + 13.5 + 14.0 + 13.9 = **83.9**

**Szenario 2: Mit Streichwertung**
- Mannschaft hat 6 Mitglieder mit Wertungen: 14.5, 13.8, 14.2, 13.5, 14.0, 13.9
- Feld "Wertungen": 6 (alle zählen)
- `int_anz_streich`: 1 (schlechteste streichen)
- Sortiert: 14.5, 14.2, 14.0, 13.9, 13.8, **13.5** ← gestrichen
- **Endergebnis**: 14.5 + 14.2 + 14.0 + 13.9 + 13.8 = **70.4**

**Szenario 3: Beste 4 von 6**
- Mannschaft hat 6 Mitglieder mit Wertungen: 14.5, 13.8, 14.2, 13.5, 14.0, 13.9
- Feld "Wertungen": 4 (beste 4 zählen)
- `int_anz_streich`: 0
- Sortiert: **14.5, 14.2, 14.0, 13.9**, 13.8, 13.5 ← letzte 2 nicht gezählt
- **Endergebnis**: 14.5 + 14.2 + 14.0 + 13.9 = **56.6**

**Szenario 4: Beste 5 von 6, davon 1 streichen**
- Mannschaft hat 6 Mitglieder mit Wertungen: 14.5, 13.8, 14.2, 13.5, 14.0, 13.9
- Feld "Wertungen": 5 (beste 5 zählen)
- `int_anz_streich`: 1 (von den 5 die schlechteste streichen)
- Sortiert: 14.5, 14.2, 14.0, 13.9, 13.8 ← beste 5
- Davon streichen: **13.8**
- **Endergebnis**: 14.5 + 14.2 + 14.0 + 13.9 = **56.6**

#### Vergleich zwischen Mannschaften

Alle Mannschaften im gleichen Wettkampf:
1. Für jede Mannschaft: Endergebnis nach obiger Formel berechnen
2. Mannschaften nach Endergebnis sortieren (höchste Punktzahl = Platz 1)
3. Rangliste anzeigen

### Datenbank
```sql
tfx_wertungen:
  int_mannschaftenid  -- Referenz zur Mannschaft
  int_teilnehmerid    -- Referenz zum Mitglied
  int_gruppenid       -- NULL bei Mannschaften
  int_startnummer     -- Automatisch vergeben (nicht manuell editierbar)
  bol_ak              -- Außer Konkurrenz (Checkbox, BESTEHENDES FELD)
  bol_startet_nicht   -- Startet Nicht (Checkbox, BESTEHENDES FELD)
  flo_note            -- Einzelwertung des Mitglieds (berechnet aus Details)

tfx_wettkaempfe:
  int_wertungen       -- Anzahl zählender Wertungen (BESTEHENDES FELD)
  int_anz_streich     -- Anzahl zu streichender Wertungen (BESTEHENDES FELD)
  bol_streichwertung  -- Flag: Streichwertung aktiv (BESTEHENDES FELD)
```

**Alle benötigten Felder existieren bereits im Schema!**

### UI-Implementierung
- **TeamScoreCapture.tsx** (bereits erstellt)
- Zeigt: Mannschaft auswählen → Mitglied auswählen → Wertung eingeben
- Pro Mitglied eine separate Wertung
- **NEU**: Endergebnis-Berechnung mit Streichwertung anzeigen

---

## Zusammenfassung: Unterschiede

**Legende**: ✅ = Muss implementiert werden | ❌ = Nicht benötigt | ✔️ = Bereits vorhanden

| Feature | Einzelteilnehmer | Gruppen | Mannschaften |
|---------|------------------|---------|--------------|
| **Mitglieder-Verwaltung** | Einzeln | Gruppe | Team |
| **Wettkampf-Zuweisung** | Direkt | Indirekt (via Wertung) | Via Wettkampf-Select |
| **Filter: Verplant** | ✅ TODO | ✅ TODO | ✅ TODO |
| **Filter: Verein** | ❌ | ✅ TODO | ✅ TODO |
| **AK pro Mitglied** | ✔️ (in Wertung) | ❌ | ✅ TODO |
| **SN pro Mitglied** | ✔️ (in Wertung) | ❌ | ✅ TODO |
| **Leistungsbewertung** | Einzeln | Gruppe gesamt | Pro Mitglied |
| **Wertungs-Granularität** | 1 Person = 1 Wertung | 1 Gruppe = 1 Wertung | 1 Person = 1 Wertung (in Mannschaft) |
| **Endergebnis-Berechnung** | Einzelwertung | Gruppenwertung | Summe (mit opt. Streichung) |

### DB-Felder Mapping

**tfx_wertungen** (für alle Typen):
- `int_teilnehmerid` - NULL bei Gruppen, gesetzt bei Einzel & Mannschaften
- `int_gruppenid` - gesetzt bei Gruppen, NULL sonst
- `int_mannschaftenid` - gesetzt bei Mannschaften, NULL sonst
- `int_startnummer` - automatisch vergeben, nicht manuell editierbar
- `bol_ak` - **Außer Konkurrenz** (Wertung zählt nicht für Platzierung)
- `bol_startet_nicht` - **Startet Nicht** (z.B. verletzt, abwesend)

**tfx_wettkaempfe** (Mannschafts-Spezifisch):
- `int_wertungen` - Anzahl zählender Wertungen (0 = alle)
- `int_anz_streich` - Anzahl zu streichender Wertungen
- `bol_streichwertung` - Flag ob Streichwertung aktiv

---

## Technische Implementierung (TODO)

### Phase 1: Filter-Buttons (Points 155-157)
**Priorität: HOCH** - Grundfunktionalität für alle drei Typen

- [ ] **Point 155 - Einzelteilnehmer**: 
  - [ ] Filter-Button "Verplante ausblenden"
  - [ ] API-Endpoint für gefilterte Teilnehmer-Liste
  - [ ] Direkte Wettkampf-Zuweisung beim Hinzufügen

- [ ] **Point 156 - Gruppen**: 
  - [ ] Filter-Button "Verplante ausblenden" (bereits teilweise vorhanden)
  - [ ] Filter-Button "Andere Vereine ausblenden" (bereits teilweise vorhanden)
  - [ ] Erweitern: `useGroupMembers` Hook mit Filter-State
  - [ ] UI: Toggle-Buttons für beide Filter

- [ ] **Point 157 - Mannschaften**: 
  - [ ] Filter-Button "Verplante ausblenden"
  - [ ] Filter-Button "Andere Vereine ausblenden"
  - [ ] Hook: `useTeamMembers` mit Filter-Parametern
  - [ ] API-Endpoint analog zu Groups `/available-participants`

### Phase 2: Mannschafts-Erweiterungen (Point 157)
**Priorität: MITTEL** - Erweiterte Mannschafts-Features

- [ ] **Wettkampf-Auswahl bei Team-Erstellung**:
  - [ ] Dropdown/Select in Team-Create-Dialog
  - [ ] Validation: Wettkampf-Typ = Mannschaft
  - [ ] Auto-Link: `tfx_mannschaften.int_wettkaempfeid`

- [ ] **AK/SN Checkboxen pro Mannschaftsmitglied**:
  - [ ] UI: Checkbox für **AK** (Außer Konkurrenz) in Members-Table
  - [ ] UI: Checkbox für **SN** (Startet Nicht) in Members-Table
  - [ ] State: `bol_ak` in `tfx_wertungen` (Boolean)
  - [ ] State: `bol_startet_nicht` in `tfx_wertungen` (Boolean)
  - [ ] Validation: Beide Felder optional, Default = false
  - [ ] Info: Startnummer (`int_startnummer`) wird automatisch vergeben

- [ ] **Wettkampf-Änderung**:
  - [ ] Edit-Funktion für bestehendes Team
  - [ ] Warning: Bei Wettkampf-Änderung und bestehenden Wertungen

### Phase 3: Leistungserfassung (Points 159-160)
**Priorität: NIEDRIG** - Scoring-Features bereits implementiert

- [x] **GroupScoreCapture**: Bereits implementiert (1 Wertung pro Gruppe)
- [x] **TeamScoreCapture**: Bereits implementiert (1 Wertung pro Mitglied)

- [ ] **Mannschafts-Endergebnis Berechnung**:
  - [ ] Backend: Aggregations-Funktion
    * Parameter: `int_wertungen` (Anzahl zählend)
    * Parameter: `int_anz_streich` (Anzahl streichen)
    * Parameter: `bol_streichwertung` (Flag)
  - [ ] Algorithmus: Sortieren → Limit → Streichen → Summieren
  - [ ] API-Endpoint: `/api/teams/:id/total-score`
  - [ ] UI: Anzeige Endergebnis mit Breakdown

- [ ] **Ranglisten-Berechnung**:
  - [ ] Backend: Mannschafts-Ranking
  - [ ] Alle Teams im Wettkampf vergleichen
  - [ ] Sortierung nach Endergebnis (höchste zuerst)
  - [ ] UI: Mannschafts-Rangliste mit Details

### Phase 4: Testing & Validation
**Priorität: HOCH** - Nach jeder Phase

- [ ] Unit Tests: Filter-Logik (verfügbare Teilnehmer)
- [ ] Unit Tests: Mannschafts-Endergebnis Berechnung
- [ ] Integration Tests: Wettkampf-Zuweisung
- [ ] UI Tests: Filter-Buttons funktional
- [ ] E2E Test: Kompletter Mannschafts-Workflow

---

## Offene Fragen

1. ✅ **AK und SN bei Mannschaften**: 
   - **GELÖST**: Beide sind Checkboxen, immer angezeigt, optional aktivierbar
   - **AK** = `bol_ak` (Außer Konkurrenz)
   - **SN** = `bol_startet_nicht` (Startet Nicht)
   - Default: unchecked (false)
   - DB-Felder existieren in `tfx_wertungen`

2. ✅ **Wettkampf-Auswahl bei Mannschaften**:
   - **GELÖST**: Kann später geändert werden
   - Bei Änderung: Bestehende Wertungen berücksichtigen

3. ✅ **Mannschafts-Endergebnis**:
   - **GELÖST**: Alle DB-Felder existieren bereits!
   - **`int_wertungen`** in `tfx_wettkaempfe` (SmallInt) - Anzahl zählender Wertungen
   - **`int_anz_streich`** in `tfx_wettkaempfe` (SmallInt) - Anzahl zu streichender Wertungen
   - Keine Schema-Änderungen nötig!

---

## Referenzen

- **Legacy C++ Code**: 
  - `participants/groupdialog.cpp` (Filter-Logik)
  - `participants/teamdialog.cpp` (falls vorhanden)
  
- **Datenbank Schema**: 
  - `tfx_gruppen`
  - `tfx_mannschaften`
  - `tfx_wertungen` (inkl. `bol_ak`, `int_startnummer`)
  - `tfx_wettkaempfe` (inkl. `int_wertungen`, `int_anz_streich`, `bol_streichwertung`)
  
- **Bestehende UI**:
  - `/groups` (Groups Management)
  - `/teams` (Teams Management)
  - `/event-participants` (Event Participants)
  - `/group-scoring` (Group Score Capture)
  - `/team-scoring` (Team Score Capture)

---

## Zusammenfassung für Entwickler

### Kritische Erkenntnisse

1. **Alle DB-Felder existieren bereits** 
   - Keine Schema-Migration nötig!
   - `tfx_wertungen`: `bol_ak` (Außer Konkurrenz), `bol_startet_nicht` (Startet Nicht)
   - `tfx_wertungen`: `int_startnummer` (automatisch vergeben, nicht editierbar)
   - `tfx_wettkaempfe`: `int_wertungen`, `int_anz_streich`, `bol_streichwertung`

2. **Filter-Pattern bereits teilweise implementiert**
   - Groups: Event-Filterung bereits vorhanden (siehe `useGroupMembers` Hook)
   - Teams: Analog zu Groups implementieren
   - Einzelteilnehmer: Neu zu implementieren

3. **Mannschafts-Berechnung ist klar definiert**
   - Sortieren → Limit (int_wertungen) → Streichen (int_anz_streich) → Summieren
   - Beide Felder können kombiniert werden
   - Flag `bol_streichwertung` muss geprüft werden

4. **AK/SN bei Mannschaften - Beide sind Checkboxen!**
   - **AK** = Außer Konkurrenz (`bol_ak`) - Teilnehmer startet, Wertung zählt nicht
   - **SN** = Startet Nicht (`bol_startet_nicht`) - Teilnehmer nimmt nicht teil
   - Beide: Boolean-Felder, immer sichtbar, optional aktivierbar
   - Startnummer (`int_startnummer`) wird **automatisch vergeben** (nicht editierbar)

5. **Automatische Startnummer-Vergabe**
   - System findet MAX(int_startnummer) im Event + Runde
   - Neue Startnummer = MAX + 1
   - Geschieht beim Speichern der Wertung, nicht in der UI

### UI-Komponenten für Mannschaften

**Members Table** sollte folgende Spalten haben:
```
| StNr. | Name | Geb. | AK ☑ | SN ☑ | Aktionen |
```

- **StNr.**: Anzeige (readonly) - automatisch vergeben
- **Name**: Anzeige (readonly) - von Teilnehmer
- **Geb.**: Anzeige (readonly) - von Teilnehmer
- **AK**: Checkbox - `bol_ak` (Außer Konkurrenz)
- **SN**: Checkbox - `bol_startet_nicht` (Startet Nicht)
- **Aktionen**: Entfernen-Button

**Wichtig**: 
- AK und SN sind **unabhängig** voneinander
- Beide können gleichzeitig aktiviert sein
- Startnummer wird beim Speichern generiert, nicht in der Tabelle editiert

### Nächste Schritte (Empfohlen)

**Sofort umsetzbar** (alle DB-Felder vorhanden):
1. Mannschafts-Mitglieder UI mit AK/SN Checkboxen erweitern
2. Wettkampf-Dropdown bei Team-Erstellung hinzufügen
3. Filter-Buttons für alle drei Typen implementieren

**Mittelfristig**:
4. Mannschafts-Endergebnis Berechnung (Backend-Logik)
5. Ranglisten-Anzeige mit Mannschafts-Wertungen

**Legacy-Kompatibilität**: 
- ✅ Groups: Event-Context bereits umgesetzt
- ⏳ Teams: Filter-Pattern analog zu Groups
- ⏳ Einzelteilnehmer: Neues Feature (kein Legacy-Pendant)
