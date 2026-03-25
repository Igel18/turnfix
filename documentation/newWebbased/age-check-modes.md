# Altersüberprüfung bei Wettkämpfen / Age Eligibility Checks

**Last Updated**: 2026-03-25  
**Related code**: `shared/src/ageCheckUtils.ts`

---

## Überblick / Overview

Für die Zuordnung von Teilnehmern zu Wettkämpfen wird das **Geburtsjahr** (nicht das genaue Geburtsdatum) als Standardmethode verwendet. Dies entspricht der Praxis im deutschen Turnbetrieb (Jahrgangsprinzip).

---

## Zwei Modi / Two Modes

### 1. Jahrgangsprüfung – DEFAULT (`ageMatchesByBirthYear`)

**Formel**: `eventJahr − Geburtsjahr ∈ [ageFrom, ageTo]`

- Nur das **Geburtsjahr** wird verglichen.
- Monat und Tag des Geburtstags werden ignoriert.
- Ein Turner, der im Dezember 2011 geboren ist, gilt für Wettkämpfe 2026 als 15 Jahre alt — unabhängig davon, ob der Wettkampf vor oder nach seinem Geburtstag stattfindet.

**Anwendung:**

```typescript
import { ageMatchesByBirthYear } from '@turnfix/shared';

// Geburtsjahr 2011, Wettkampf erfordert Altersgruppe 15–18
const eligible = ageMatchesByBirthYear(2011, 15, 18); // true (2026 - 2011 = 15)
```

### 2. Genaue Datumsüberprüfung – NICHT Standard (`ageMatchesExact`)

**Formel**: Exaktes Alter am Referenzdatum (Monat und Tag berücksichtigt)

- Nur im Code erhalten — wird derzeit nicht als Standard verwendet.
- Ein Turner, der im Dezember 2011 geboren ist, hätte im März 2026 noch nicht seinen 15. Geburtstag gefeiert → Alter = 14 → würde bei Altersgruppe 15+ **scheitern**.

**Anwendung:**

```typescript
import { ageMatchesExact } from '@turnfix/shared';

// Geburtsdatum 2011-12-15, Wettkampf März 2026, Altersgruppe 15–18
const eligible = ageMatchesExact('2011-12-15', 15, 18); // false (exaktes Alter = 14)
```

---

## Wichtiger Unterschied / Key Difference

| Situation | Jahrgangsprüfung (Standard) | Genaue Prüfung |
|---|---|---|
| Turner geb. Dez. 2011, Wettkampf März 2026, AK 15–18 | ✅ eligible (15) | ❌ not eligible (14) |
| Turner geb. März 2011, Wettkampf März 2026, AK 15–18 | ✅ eligible (15) | ✅ eligible (15) |
| Turner geb. März 2012, Wettkampf März 2026, AK 15–18 | ❌ not eligible (14) | ❌ not eligible (13) |

---

## UI: Checkbox im Wettkampfformular

Im Wettkampf-Formular ist eine **ausgegraufte Checkbox** "Jahrgangsprüfung (Standard)" zu sehen.

- Die Checkbox ist **immer angehakt** (true) und **deaktiviert**.
- Sie zeigt an, dass das Jahrgangsprinzip das Standard-Verhalten ist.
- Es gibt noch **kein Datenbankfeld** für diese Einstellung (keine Pro-Wettkampf-Umschaltung möglich).
- Tooltip erklärt: "Dieses Verhalten ist im Standard festgelegt. Ein DB-Feld für diese Einstellung existiert noch nicht."

---

## Implementierungsdetails / Implementation Details

### Funktion: `ageMatchesByBirthYear`

```
shared/src/ageCheckUtils.ts
```

Parameter:
- `birthYear: number` — Geburtsjahr des Teilnehmers (z. B. 2010)
- `ageFrom: number` — Mindestalter für den Wettkampf (inklusive)
- `ageTo: number` — Höchstalter für den Wettkampf (inklusive)
- `eventYear?: number` — Jahr des Wettkampfs (Standard: aktuelles Jahr)

Rückgabewert: `true` wenn berechtigt, `false` wenn nicht.

**Sonderfälle:**
- `birthYear = 0` oder ungültig → `true` (unbekannte Daten blockieren nie)
- Invertiertes `ageFrom`/`ageTo` → wird automatisch normalisiert

### Integration in Hooks

**`useAddParticipantWizard.ts`** — filtert die angezeigten Wettkämpfe nach Teilnehmer-Geburtsjahr:

```typescript
const birthYear = selectedParticipant.birthYear;
if (birthYear && birthYear > 0) {
  if (!ageMatchesByBirthYear(birthYear, comp.ageFrom, comp.ageTo)) return false;
} else {
  // Fallback: berechnetes Alter, falls Geburtsjahr nicht verfügbar
  if (!ageMatchesCompetition(selectedParticipant.age, comp)) return false;
}
```

**`useParticipantValidation.ts`** — validiert Teilnehmer bei der Wettkampfzuordnung:

```typescript
const birthYear = new Date(birthday).getFullYear();
if (birthYear > 0 && !ageMatchesByBirthYear(birthYear, competition.ageFrom, competition.ageTo)) {
  const age = calculateAgeByYear(birthday);
  reasons.push(t('eventParticipants.validation.ageWarning', { age, ageFrom, ageTo }));
}
```

---

## Datenbank-Hinweis / Database Note

Die Altersgruppe in der Datenbank wird als Geburtsjahre gespeichert (`yer_von`, `yer_bis`), wird aber vom Server bei der API-Antwort in Alterswerte umgerechnet:

```
ageFrom = eventJahr − yer_von
ageTo   = eventJahr − yer_bis
```

Das impliziert das Veranstaltungsjahr in den `ageFrom`/`ageTo`-Werten.

---

## Zukünftige Erweiterung / Future Extension

Wenn eine Pro-Wettkampf-Einstellung gewünscht ist, muss:
1. Ein Datenbankfeld (z. B. `bol_jahrgangspruefung`) zur Tabelle `tfx_wettkampf` hinzugefügt werden.
2. Das Wettkampfformular um eine aktivierbare Checkbox erweitert werden.
3. Der Prüfmodus in den Hooks dynamisch aus den Wettkampfdaten gelesen werden.
