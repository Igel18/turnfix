# Analyse: Gruppen und Mannschaftswettkämpfe

## 87. Prio 9 - Gruppen und Mannschaftswettkämpfe

### Zusammenfassung
Die alte QT-Anwendung unterstützt zwei Arten von Wettkampf-Teilnehmern:
1. **Einzelteilnehmer** (Standard): Eine Person nimmt individuell am Wettkampf teil
2. **Gruppen**: Mehrere Personen treten als Gruppe auf (z.B. Synchronturnen)
3. **Mannschaften/Teams**: Vereine können mehrere Teams in einem Wettkampf anmelden, die aus Einzelteilnehmern oder Gruppen bestehen

---

## Datenbank-Schema (bereits vorhanden in Prisma)

### 1. tfx_gruppen (Gruppen)
```prisma
model tfx_gruppen {
  int_gruppenid            Int                        @id @default(autoincrement())
  int_vereineid            Int                        // Zugehöriger Verein
  var_name                 String?                    // Gruppenname (z.B. "Synchrongruppe 1")
  tfx_gruppen_x_teilnehmer tfx_gruppen_x_teilnehmer[] // Gruppenmitglieder
  tfx_wertungen            tfx_wertungen[]            // Wertungen der Gruppe
}
```

### 2. tfx_gruppen_x_teilnehmer (Gruppenmitgliedschaft)
```prisma
model tfx_gruppen_x_teilnehmer {
  int_gruppen_x_teilnehmerid Int       @id @default(autoincrement())
  int_gruppenid              Int       // Gruppe
  int_teilnehmerid           Int       // Teilnehmer
  tfx_gruppen                tfx_gruppen    @relation(...)
  tfx_teilnehmer             tfx_teilnehmer @relation(...)
}
```

### 3. tfx_mannschaften (Teams/Mannschaften)
```prisma
model tfx_mannschaften {
  int_mannschaftenid   Int                    @id @default(autoincrement())
  int_wettkaempfeid    Int                    // Wettkampf
  int_vereineid        Int                    // Verein
  int_nummer           Int?                   // Team-Nummer (1., 2., 3. Mannschaft)
  var_riege            String?                // Riegen-Zuordnung
  int_startnummer      Int?                   // Start-Nummer
  tfx_man_x_man_ab     tfx_man_x_man_ab[]    // Team-Abzüge/Strafen
  tfx_man_x_teilnehmer tfx_man_x_teilnehmer[] // Team-Mitglieder (veraltet)
  tfx_wertungen        tfx_wertungen[]        // Wertungen der Team-Mitglieder
}
```

### 4. tfx_mannschaften_abzug (Team-Strafen/Abzüge)
```prisma
model tfx_mannschaften_abzug {
  int_mannschaften_abzugid Int     @id @default(autoincrement())
  var_name                 String? // Name der Strafe
  rel_abzug                Float?  // Abzugswert
}
```

### 5. tfx_man_x_man_ab (Team-Strafen-Zuordnung)
```prisma
model tfx_man_x_man_ab {
  int_man_x_man_abid       Int       @id @default(autoincrement())
  int_mannschaftenid       Int       // Team
  int_mannschaften_abzugid Int       // Strafe
}
```

### 6. tfx_wertungen (Wertungen - Kern-Tabelle)
```prisma
model tfx_wertungen {
  int_wertungenid    Int      @id @default(autoincrement())
  int_wettkaempfeid  Int      // Wettkampf
  int_teilnehmerid   Int?     // ENTWEDER Einzelteilnehmer
  int_gruppenid      Int?     // ODER Gruppe
  int_mannschaftenid Int?     // Optional: Team-Zugehörigkeit
  int_statusid       Int      // Status (angemeldet, gestartet, etc.)
  int_runde          Int?     // Runde
  int_startnummer    Int?     // Startnummer
  bol_ak             Boolean? // Außer Konkurrenz
  bol_startet_nicht  Boolean? // Nimmt nicht teil
  var_riege          String?  // Riegen-Zuordnung
  var_comment        String?  // Kommentar
}
```

**Wichtig**: `tfx_wertungen` ist die zentrale Tabelle. Ein Datensatz kann ENTWEDER:
- `int_teilnehmerid` (Einzelperson) ODER
- `int_gruppenid` (Gruppe)
enthalten, NICHT beides gleichzeitig!

Optional kann `int_mannschaftenid` gesetzt sein, wenn der Teilnehmer/Gruppe zu einem Team gehört.

---

## Funktionalität in der QT-Anwendung

### 1. Anzeige-Logik (Name-Display)
**Pattern in allen Queries:**
```sql
CASE WHEN tfx_gruppen.int_gruppenid IS NULL 
  THEN var_vorname || ' ' || var_nachname 
  ELSE tfx_gruppen.var_name 
END
```

**Bedeutung**: 
- Wenn `int_gruppenid` NULL → zeige Personenname (Vorname + Nachname)
- Wenn `int_gruppenid` gesetzt → zeige Gruppenname

**Verwendet in:**
- Startlisten (`startingorderwidget.cpp`)
- Status-Übersicht (`statuswidget.cpp`)
- Ergebnislisten (`result_calc.cpp`)
- Riegen-Zuordnung (`assignmenttablemodel.cpp`)

### 2. Verein-Zuordnung (Club Assignment)
```sql
INNER JOIN tfx_vereine ON 
  tfx_vereine.int_vereineid = tfx_teilnehmer.int_vereineid OR 
  tfx_vereine.int_vereineid = tfx_gruppen.int_vereineid
```

**Bedeutung**: Verein kann entweder über Teilnehmer ODER über Gruppe zugeordnet sein.

### 3. Team-Wertung (Mannschaftswertung)

**Abfrage aller Teams eines Wettkampfs:**
```sql
SELECT int_mannschaftenid, tfx_vereine.var_name, 
       tfx_mannschaften.int_nummer ||'. Mannschaft', 
       int_mannschaftenid 
FROM tfx_mannschaften 
INNER JOIN tfx_vereine USING (int_vereineid)
WHERE int_veranstaltungenid=? AND tfx_wettkaempfe.var_nummer=?
```

**Logik** (`result_calc.cpp`, Lines 149-180):
1. Hole alle Teams für einen Wettkampf
2. Für jedes Team:
   - Hole alle Wertungen mit `int_mannschaftenid`
   - Berechne Geräte-Ergebnisse für alle Team-Mitglieder
   - Sortiere Ergebnisse (beste N Wertungen zählen)
   - Ziehe Streichresultate ab (konfigurierbar)
   - Addiere Team-Strafen (`tfx_mannschaften_abzug`)
   - Berechne Team-Gesamtsumme

**Streichresultate**: 
- Pro Gerät: Die X schlechtesten Wertungen werden gestrichen
- Konfiguriert im Wettkampf (`wk.value(6).toInt()`)

**Team-Strafen**:
- Können mehrere pro Team sein
- Werden vom Team-Ergebnis abgezogen
- Beispiele: "Verspätete Meldung -0.5 Pkt.", "Unvollständige Mannschaft -1.0 Pkt."

### 4. Riegen-Zuordnung (Squad Assignment)

**Wichtig**: Sowohl Einzelpersonen als auch ganze Teams können Riegen zugeordnet werden!

```sql
-- Bei Team-Zuordnung: Alle Team-Mitglieder bekommen die gleiche Riege
UPDATE tfx_mannschaften SET var_riege=? WHERE int_mannschaftenid=?
UPDATE tfx_wertungen SET var_riege=? WHERE int_mannschaftenid=?
```

**Code** (`assignmenttablemodel.cpp`, Lines 86-168, aktuell auskommentiert):
- Wenn ein Team einer Riege zugeordnet wird, werden automatisch alle Wertungen dieses Teams aktualisiert
- So starten alle Team-Mitglieder in der gleichen Riege

### 5. Startlisten (Starting Order)

**Query** (`startingorderwidget.cpp`, Lines 87-110):
```sql
SELECT CASE WHEN tfx_gruppen.int_gruppenid IS NULL 
         THEN var_vorname || ' ' || var_nachname 
         ELSE tfx_gruppen.var_name 
       END, 
       tfx_vereine.var_name, 
       tfx_wertungen.int_wertungenid, 
       int_pos 
FROM tfx_wertungen 
LEFT JOIN tfx_teilnehmer ON tfx_teilnehmer.int_teilnehmerid = tfx_wertungen.int_teilnehmerid 
LEFT JOIN tfx_gruppen ON tfx_gruppen.int_gruppenid = tfx_wertungen.int_gruppenid 
LEFT JOIN tfx_mannschaften ON tfx_mannschaften.int_mannschaftenid = tfx_wertungen.int_mannschaftenid
...
ORDER BY int_pos, tfx_wettkaempfe.var_nummer, 
         tfx_mannschaften.int_nummer, tfx_mannschaften.int_mannschaftenid, 
         tfx_wertungen.int_startnummer
```

**Sortierung**:
1. Position (falls manuell gesetzt)
2. Wettkampf-Nummer
3. Team-Nummer (1., 2., 3. Mannschaft)
4. Team-ID
5. Startnummer

→ **Teams starten zusammen**, sortiert nach Team-Nummer!

### 6. Gruppenwertung vs. Einzelwertung

**Spezielle Abfrage für Gruppenwertung** (`result_calc.cpp`, Line 368):
```sql
SELECT CASE WHEN bol_ak='true' THEN 'AK' ELSE '' END AS platz, 
       tfx_gruppen.var_name, 
       tfx_vereine.var_name, 
       '', 
       tfx_gruppen.int_gruppenid 
FROM tfx_wertungen 
INNER JOIN tfx_gruppen ON tfx_wertungen.int_gruppenid = tfx_gruppen.int_gruppenid
WHERE int_veranstaltungenid=? AND var_nummer=? AND bol_startet_nicht='false' 
GROUP BY tfx_gruppen.int_gruppenid, bol_ak, tfx_gruppen.var_name, tfx_vereine.var_name 
ORDER BY bol_ak DESC
```

**Bedeutung**: 
- Nur Gruppen werden ausgewertet (INNER JOIN auf tfx_gruppen)
- Gruppierung nach Gruppe (nicht nach Person)
- Separate Wertung für Gruppen

### 7. Team-Dialog UI (teamdialog.cpp)

**Funktionen**:
1. **Team erstellen/bearbeiten**:
   - Verein auswählen
   - Team-Nummer setzen (1., 2., 3. Mannschaft)
   - Wettkampf auswählen
   - Riege zuordnen

2. **Teilnehmer hinzufügen**:
   - Einzelpersonen aus Verein auswählen
   - ODER bestehende Gruppen auswählen
   - Startnummern werden automatisch vergeben

3. **Team-Strafen**:
   - Aus Liste vordefinierter Strafen auswählen
   - Mehrfachauswahl möglich
   - Strafen werden bei Berechnung abgezogen

4. **Validierung**:
   - Warnung, wenn Team zu wenig Mitglieder hat
   - Prüfung des Jahrgangs (nur bei Einzelpersonen)

---

## Web-UI: Fehlende Funktionalität

### ✅ Bereits vorhanden in Web-UI
- Einzelteilnehmer-Verwaltung
- Wettkampf-Verwaltung
- Verein-Verwaltung
- Startnummern-Vergabe
- Riegen-Zuordnung (nur für Einzelpersonen)

### ❌ Fehlt in Web-UI

#### Backend (Prisma/Express)
1. ❌ API-Route für Gruppen (CRUD)
2. ❌ API-Route für Gruppenmitglieder
3. ❌ API-Route für Teams/Mannschaften (CRUD)
4. ❌ API-Route für Team-Mitglieder
5. ❌ API-Route für Team-Strafen
6. ❌ Ergebnis-Berechnung für Teams
7. ❌ Ergebnis-Berechnung für Gruppen
8. ❌ Wertungen mit Gruppen-ID statt Teilnehmer-ID

#### Frontend (React)
1. ❌ Gruppen-Verwaltungs-Seite
2. ❌ Gruppenmitglieder hinzufügen/entfernen
3. ❌ Team-Verwaltungs-Seite
4. ❌ Team-Dialog (ähnlich wie QT)
5. ❌ Team-Mitglieder-Auswahl
6. ❌ Team-Strafen-Auswahl
7. ❌ Wettkampf-Typ-Auswahl (Einzel/Gruppe/Mannschaft)
8. ❌ Anzeige-Logik: Gruppenname statt Personenname
9. ❌ Riegen-Zuordnung für Teams
10. ❌ Startlisten mit Team-Sortierung
11. ❌ Ergebnislisten mit Team-Wertung
12. ❌ Meldematrix mit Gruppen und Teams

---

## TODO-Liste für Web-UI

### Phase 1: Backend - Grundstruktur (Prio: HOCH)

- [ ] **1.1 API: Gruppen**
  - [ ] `GET /api/groups` - Alle Gruppen
  - [ ] `GET /api/groups/:id` - Eine Gruppe
  - [ ] `POST /api/groups` - Gruppe erstellen
  - [ ] `PUT /api/groups/:id` - Gruppe bearbeiten
  - [ ] `DELETE /api/groups/:id` - Gruppe löschen
  - [ ] `GET /api/groups/club/:clubId` - Gruppen eines Vereins

- [ ] **1.2 API: Gruppenmitglieder**
  - [ ] `GET /api/groups/:id/members` - Mitglieder einer Gruppe
  - [ ] `POST /api/groups/:id/members` - Mitglied hinzufügen
  - [ ] `DELETE /api/groups/:groupId/members/:participantId` - Mitglied entfernen

- [ ] **1.3 API: Teams/Mannschaften**
  - [ ] `GET /api/teams` - Alle Teams
  - [ ] `GET /api/teams/:id` - Ein Team
  - [ ] `POST /api/teams` - Team erstellen
  - [ ] `PUT /api/teams/:id` - Team bearbeiten
  - [ ] `DELETE /api/teams/:id` - Team löschen
  - [ ] `GET /api/teams/competition/:competitionId` - Teams eines Wettkampfs
  - [ ] `GET /api/teams/event/:eventId` - Teams einer Veranstaltung

- [ ] **1.4 API: Team-Strafen**
  - [ ] `GET /api/team-penalties` - Alle verfügbaren Strafen
  - [ ] `POST /api/team-penalties` - Strafe erstellen
  - [ ] `GET /api/teams/:id/penalties` - Strafen eines Teams
  - [ ] `POST /api/teams/:id/penalties` - Strafe zuordnen
  - [ ] `DELETE /api/teams/:teamId/penalties/:penaltyId` - Strafe entfernen

- [ ] **1.5 API: Wertungen erweitern**
  - [ ] Wertungen mit `int_gruppenid` erstellen können
  - [ ] Wertungen mit `int_mannschaftenid` verknüpfen
  - [ ] Validierung: ENTWEDER `int_teilnehmerid` ODER `int_gruppenid`

### Phase 2: Frontend - Gruppen (Prio: HOCH)

- [ ] **2.1 Gruppen-Verwaltung**
  - [ ] Seite `/groups` - Gruppen-Liste
  - [ ] Gruppe erstellen/bearbeiten Dialog
  - [ ] Gruppenname, Verein auswählen
  - [ ] Filter nach Verein
  - [ ] Suche nach Gruppenname

- [ ] **2.2 Gruppenmitglieder**
  - [ ] Mitglieder-Liste in Gruppen-Detail
  - [ ] Teilnehmer aus Verein hinzufügen
  - [ ] Teilnehmer entfernen
  - [ ] Drag & Drop für Reihenfolge (optional)

- [ ] **2.3 Wettkampf-Anmeldung mit Gruppen**
  - [ ] In Event-Participants: Gruppen zusätzlich zu Einzelpersonen anzeigen
  - [ ] Filter: "Einzelperson" / "Gruppe" / "Alle"
  - [ ] Bei Anmeldung: Auswahl zwischen Einzelperson und Gruppe
  - [ ] Display-Logic: Gruppenname statt Personenname
  - [ ] Gruppenmitglieder anzeigen (Tooltip oder Expandable)

### Phase 3: Frontend - Teams/Mannschaften (Prio: MITTEL)

- [ ] **3.1 Team-Verwaltung**
  - [ ] Seite `/teams` - Team-Liste
  - [ ] Team erstellen/bearbeiten Dialog
  - [ ] Team-Nummer (1., 2., 3. Mannschaft)
  - [ ] Wettkampf auswählen
  - [ ] Verein auswählen
  - [ ] Riege zuordnen
  - [ ] Filter nach Event, Verein, Wettkampf

- [ ] **3.2 Team-Mitglieder**
  - [ ] Verfügbare Teilnehmer anzeigen (Einzel + Gruppen aus Verein)
  - [ ] Filter: nur ungenutzte / alle / nur aus diesem Verein
  - [ ] Checkbox-Auswahl oder Drag & Drop
  - [ ] Mitglieder hinzufügen/entfernen
  - [ ] Mindest-Anzahl-Validierung (aus Wettkampf-Konfiguration)

- [ ] **3.3 Team-Strafen**
  - [ ] Liste verfügbarer Strafen
  - [ ] Checkbox-Auswahl (Mehrfachauswahl)
  - [ ] Strafen-Verwaltung (Admin)
  - [ ] Anzeige der Gesamt-Abzüge

- [ ] **3.4 Riegen-Zuordnung für Teams**
  - [ ] In Squad-Management: Teams zusätzlich zu Einzelpersonen
  - [ ] Wenn Team zugeordnet → alle Mitglieder bekommen gleiche Riege
  - [ ] Warnung bei Konflikten

### Phase 4: Ergebnis-Berechnung (Prio: HOCH)

- [ ] **4.1 Gruppen-Ergebnisse**
  - [ ] Ergebnis-Berechnung für Gruppen (wie Einzelpersonen)
  - [ ] Gruppenwertung in Results-Page
  - [ ] Filter: Einzel / Gruppen / Alle
  - [ ] Gruppenmitglieder in Ergebnis-Details anzeigen

- [ ] **4.2 Team-Ergebnisse**
  - [ ] Ergebnis-Berechnung für Teams
  - [ ] Streichresultate berücksichtigen
  - [ ] Team-Strafen abziehen
  - [ ] Team-Wertung in Results-Page
  - [ ] Team-Details expandierbar (alle Mitglieder-Ergebnisse)

- [ ] **4.3 Wettkampf-Typ-Konfiguration**
  - [ ] In Competition-Settings: Typ auswählen
    * Einzelwertung
    * Gruppenwertung
    * Mannschaftswertung
    * Kombiniert
  - [ ] Streichresultate konfigurieren (Anzahl)
  - [ ] Mindest-Team-Größe

### Phase 5: Startlisten & Listen (Prio: MITTEL)

- [ ] **5.1 Startlisten**
  - [ ] Sortierung nach Team-Nummer
  - [ ] Teams zusammen anzeigen
  - [ ] Gruppennamen anzeigen
  - [ ] Riegen-Zuordnung für Teams

- [ ] **5.2 Meldematrix**
  - [ ] Gruppen zählen
  - [ ] Teams zählen
  - [ ] Separate Zeilen oder Spalten (?)

- [ ] **5.3 Status-Übersicht**
  - [ ] Gruppennamen anzeigen
  - [ ] Team-Zugehörigkeit anzeigen

### Phase 6: PDF-Exporte (Prio: NIEDRIG)

- [ ] **6.1 PDF-Updates**
  - [ ] Teilnehmerliste: Gruppen und Teams
  - [ ] Startlisten: Team-Sortierung
  - [ ] Ergebnisse: Team-Wertung
  - [ ] Meldematrix: Gruppen zählen

### Phase 7: UI/UX (Prio: NIEDRIG)

- [ ] **7.1 Lokalisierung**
  - [ ] `groups.*` - Gruppen-Strings (DE/EN)
  - [ ] `teams.*` - Team-Strings (DE/EN)
  - [ ] `teamPenalties.*` - Strafen-Strings (DE/EN)

- [ ] **7.2 Icons & Badges**
  - [ ] Icon für Gruppe (z.B. 👥)
  - [ ] Icon für Team (z.B. 🏆)
  - [ ] Badge für Team-Nummer ("1. Mannschaft")

- [ ] **7.3 Hilfetexte**
  - [ ] BlueInfoBox für Gruppen-Erklärung
  - [ ] BlueInfoBox für Team-Erklärung
  - [ ] Workflow-Hinweise (YellowInfoBox)

---

## Technische Hinweise

### Backend-Patterns

**Prisma-Queries für Gruppen:**
```typescript
// Gruppe mit Mitgliedern
const group = await prisma.tfx_gruppen.findUnique({
  where: { int_gruppenid: id },
  include: {
    tfx_gruppen_x_teilnehmer: {
      include: {
        tfx_teilnehmer: true
      }
    }
  }
});
```

**Display-Name-Logic:**
```typescript
// Backend: JSON response mit Type
{
  id: 123,
  type: 'group' | 'participant',
  name: '...',  // Entweder Gruppenname oder Vor-/Nachname
  participants: [...] // Nur bei Gruppen
}

// Frontend: Conditional rendering
{participant.type === 'group' ? (
  <span>{participant.name} 👥</span>
) : (
  <span>{participant.firstName} {participant.lastName}</span>
)}
```

**Team-Ergebnis-Berechnung:**
```typescript
// 1. Alle Wertungen des Teams holen
const scores = await prisma.tfx_wertungen.findMany({
  where: { int_mannschaftenid: teamId },
  include: { tfx_wertungen_details: true }
});

// 2. Pro Gerät sortieren und beste N nehmen
const deviceResults = scores.reduce((acc, score) => {
  // Gruppieren nach Gerät
  // Sortieren absteigend
  // Beste N nehmen (N = teamSize - streichresultate)
  return acc;
}, {});

// 3. Team-Strafen holen und abziehen
const penalties = await prisma.tfx_man_x_man_ab.findMany({
  where: { int_mannschaftenid: teamId },
  include: { tfx_mannschaften_abzug: true }
});
const totalPenalty = penalties.reduce((sum, p) => 
  sum + p.tfx_mannschaften_abzug.rel_abzug, 0);

// 4. Gesamtergebnis = Summe - Strafen
const teamTotal = deviceResults.total - totalPenalty;
```

### Frontend-Patterns

**Gruppen-Auswahl-Komponente:**
```tsx
<Select>
  <option value="">Teilnehmer auswählen...</option>
  <optgroup label="Einzelpersonen">
    {participants.map(p => (
      <option key={p.id} value={`p_${p.id}`}>
        {p.firstName} {p.lastName}
      </option>
    ))}
  </optgroup>
  <optgroup label="Gruppen">
    {groups.map(g => (
      <option key={g.id} value={`g_${g.id}`}>
        👥 {g.name} ({g.memberCount} Mitglieder)
      </option>
    ))}
  </optgroup>
</Select>
```

**Team-Mitglieder-Liste:**
```tsx
<div className="team-members">
  <h3>Team-Mitglieder ({members.length}/{minSize})</h3>
  {members.length < minSize && (
    <RosaInfoBox>
      Mindestens {minSize} Mitglieder erforderlich!
    </RosaInfoBox>
  )}
  <ul>
    {members.map(m => (
      <li key={m.id}>
        {m.type === 'group' ? '👥' : '👤'} {m.name}
        <button onClick={() => removeMember(m.id)}>❌</button>
      </li>
    ))}
  </ul>
</div>
```

---

## Geschätzte Aufwände

| Phase | Aufwand | Priorität |
|-------|---------|-----------|
| Phase 1: Backend - Grundstruktur | 3-4 Tage | HOCH |
| Phase 2: Frontend - Gruppen | 2-3 Tage | HOCH |
| Phase 3: Frontend - Teams | 3-4 Tage | MITTEL |
| Phase 4: Ergebnis-Berechnung | 2-3 Tage | HOCH |
| Phase 5: Startlisten & Listen | 1-2 Tage | MITTEL |
| Phase 6: PDF-Exporte | 1 Tag | NIEDRIG |
| Phase 7: UI/UX | 1 Tag | NIEDRIG |
| **GESAMT** | **13-20 Tage** | - |

---

## Nächste Schritte

1. ✅ **Analyse abgeschlossen** - Dieses Dokument
2. ⏳ **Entscheidung**: Sollen wir mit Phase 1 (Backend) beginnen?
3. ⏳ **Priorisierung**: Welche Funktionen sind am wichtigsten?
   - Nur Gruppen? (Phases 1-2)
   - Nur Teams? (Phases 1, 3-4)
   - Beides? (Alle Phasen)

---

## Offene Fragen

1. **Wettkampf-Typen**: Soll ein Wettkampf gleichzeitig Einzel-, Gruppen- UND Team-Wertung haben?
   - In QT: Scheint so (getrennte Wertungen)
   - In Web-UI: Tabs? Separate Ansichten?

2. **Team-Größe**: Wo wird die Mindest-/Maximal-Größe definiert?
   - In QT: `int_wertungen` in `tfx_wettkaempfe`
   - In Prisma: Feld fehlt aktuell in schema!

3. **Gruppen-Jahrgänge**: Haben Gruppen ein "Alter"?
   - In QT: Keine Geburtsdatum-Anzeige für Gruppen
   - In Web-UI: N/A für Gruppen?

4. **Meldematrix**: Wie Gruppen/Teams zählen?
   - 1 Gruppe = 1 Teilnehmer? Oder = Anzahl Mitglieder?
   - 1 Team = ? (Vermutlich 1 Team)

---

**Erstellt**: 2025-01-XX
**Analysiert aus**: QT C++ Codebase (turnfix)
**Ziel**: Feature-Parity in Web-UI (React/Express/Prisma)
