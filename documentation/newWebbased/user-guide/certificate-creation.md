# Urkunden erstellen & Drucken

**Zielgruppe**: Wettkampfleiter, Event-Manager, Administratoren  
**Schwierigkeit**: ⭐⭐ Mittel  
**Zeitaufwand**: 15-20 Minuten Setup, dann automatischer Druck

---

## 📋 Übersicht

Das **Urkunden-System** in TurnFix ermöglicht:

- ✅ **Flexible Layouts** - Eigene Vorlagen erstellen mit Editor
- ✅ **Automatische Daten** - Teilnehmer-Daten werden automatisch eingetragen
- ✅ **Massen-Export** - Alle Urkunden eines Wettkampfs mit einem Klick
- ✅ **PDF-Generierung** - Professionelle PDFs für Druck
- ✅ **Platzierungs-Logik** - Unterschiedliche Layouts für Platzierungen
- ✅ **Vorschau** - Testen vor dem Druck

**Workflow**:
1. **Layout erstellen** (einmalig, wiederverwendbar)
2. **Teilnehmer zuordnen** (automatisch nach Wertungen)
3. **PDF generieren** (alle oder einzelne)
4. **Drucken** (lokal oder Netzwerk-Drucker)

---

## 🎯 Kernkonzepte

### 1. Urkunden-Layouts

**Was ist ein Layout?**
- Eine **Vorlage** für Urkunden-Gestaltung
- Enthält **Textfelder**, **Bilder**, **Logos**
- Verknüpft mit **Datenbank-Feldern** (automatische Eintragung)

**Beispiel-Layout**:
```
┌─────────────────────────────────────┐
│  [LOGO]     SIEGERURKUNDE    [LOGO] │
│                                     │
│  {Veranstaltungsname}               │
│  {Veranstaltungsdatum}              │
│                                     │
│  Platz: {Platz}                     │
│  Name:  {Name}                      │
│  Verein: {Verein}                   │
│  Wettkampf: {Wettkampfbezeichnung}  │
│  Punkte: {Punkte}                   │
│                                     │
│  [Unterschrift]                     │
└─────────────────────────────────────┘
```

### 2. Datenbank-Felder

**Automatisch befüllte Platzhalter**:

| Feld-Nr. | Name | Beschreibung | Beispiel |
|----------|------|--------------|----------|
| 0 | Veranstaltungsname | Name des Events | "Bezirksmeisterschaften 2025" |
| 1 | Veranstaltungsdatum | Datum des Events | "05.11.2025" |
| 2 | Veranstaltungsort | Wettkampfstätte | "Sporthalle Musterhausen" |
| 3 | Name | Teilnehmer-Name | "Müller, Max" |
| 4 | Verein | Vereins-Name | "TV Musterhausen" |
| 5 | Platz | Platzierung | "1. Platz" |
| 6 | Punkte | Gesamtpunktzahl | "54,30" |
| 7 | Wettkampfbezeichnung | Wettkampf-Name | "Männlich AK 12-13" |
| 8 | Wettkampfbezeichnung mit Jahrgang | + Jahrgang | "Männlich AK 12-13 (2012/2013)" |
| 9 | Turnkreis/-gau | Region | "Turngau Oberschwaben" |
| 10 | Verband | Landes-Verband | "STB Baden-Württemberg" |
| 11 | Land | Bundesland | "Baden-Württemberg" |
| 12 | Ausdruck-Typ | Sieger-/Teilnahme-Urkunde | "Siegerurkunde" |
| 13 | Summe Platzziffern | Mannschafts-Summe | "15" |
| 14 | Mannschaftsnamen | Team-Namen | "Team A, Team B" |
| 15 | Wettkampfnummer | Interne Nr. | "1a" |

**Code-Referenz**:
```typescript
// Aus C++ legacy code (_global.cpp)
// Diese Feld-Nummern sind kompatibel mit alter TurnFix-Version
export const DATABASE_FIELD_DESCRIPTIONS: { [key: number]: string } = {
  0: 'Veranstaltungsname',
  1: 'Veranstaltungsdatum',
  3: 'Name (Teilnehmer)',
  5: 'Platz',
  6: 'Punkte',
  // ... (siehe CertificateLayouts.tsx)
};
```

### 3. Feld-Typen

**Im Layout-Editor verfügbar**:

| Typ | Verwendung | Beispiel |
|-----|------------|----------|
| **Text** | Statischer Text | "Urkunde", "Herzlichen Glückwunsch" |
| **Datenbank-Feld** | Dynamische Daten | {Name}, {Platz}, {Punkte} |
| **Bild** | Logos, Grafiken | Vereins-Logo, Verbands-Logo |

### 4. Platzierungs-Logik

**Unterschiedliche Layouts für**:
- **Siegerurkunden** (Platz 1-3)
- **Teilnehmer-Urkunden** (Platz 4+)
- **Sonder-Urkunden** (z.B. bester Vereins-Turner)

**System wählt automatisch** basierend auf Platzierung.

---

## ✅ Voraussetzungen

1. ✅ **Wettkampf abgeschlossen** - Alle Wertungen erfasst
2. ✅ **Ergebnisse berechnet** - Platzierungen feststehen
3. ✅ **Event-Daten komplett** - Veranstaltungsname, Datum, Ort gesetzt
4. ✅ **Drucker konfiguriert** - Lokal oder Netzwerk-Drucker (optional)

**Empfohlen**:
- 📄 **Test-Druck** vor Wettkampf
- 🎨 **Vereins-Logo** hochgeladen (PNG/JPG)
- 🎨 **Verbands-Logo** hochgeladen (falls gewünscht)

---

## 🚀 Schritt 1: Urkunden-Layouts verwalten

### 1.1 Layouts-Übersicht öffnen

![Urkunden-Layouts Übersicht](../images/ui-screenshots/CertificateLayouts.png)

**Navigation**: Hauptmenü → **"Urkunden-Layouts"**

**Übersicht zeigt**:
- Alle vorhandenen Layouts
- Anzahl Felder pro Layout
- Name und Beschreibung
- Aktionen (Bearbeiten, Duplizieren, Löschen)

### 1.2 Neues Layout erstellen

**Button**: **"+ Neues Layout"** (oben rechts)

**System**:
1. Erstellt leeres Layout mit Name "Neues Layout"
2. Öffnet automatisch den **Layout-Editor**
3. Sie können sofort mit Gestaltung beginnen

### 1.3 Bestehendes Layout bearbeiten

**Aktionen pro Layout**:

| Aktion | Symbol | Funktion |
|--------|--------|----------|
| **Bearbeiten** | ✏️ | Layout-Editor öffnen |
| **Duplizieren** | 📋 | Kopie erstellen (für Varianten) |
| **Löschen** | 🗑️ | Layout entfernen |
| **Auswählen** | ☑️ | Als Standard für Druck setzen |

**💡 Tipp**: Duplizieren Sie Layouts für Varianten (z.B. "Sieger Gold", "Sieger Silber")

---

## 🎨 Schritt 2: Layout-Editor nutzen

### 2.1 Editor-Oberfläche

![Layout-Editor](../images/ui-screenshots/CertificateLayouts_Editor.png)

**Bereiche**:
1. **Toolbar** (oben): Tools zum Hinzufügen von Elementen
2. **Canvas** (Mitte): Vorschau der Urkunde (DIN A4)
3. **Eigenschaften** (rechts): Feld-Einstellungen
4. **Felder-Liste** (links): Alle Elemente im Layout

### 2.2 Text-Feld hinzufügen

**Klicken Sie auf**: **"Text hinzufügen"** (Toolbar)

**Eigenschaften**:
- **Text**: Eingabefeld für statischen Text
- **Position**: X/Y-Koordinaten (0-100% der Seite)
- **Größe**: Breite/Höhe (0-100%)
- **Schrift**: Schriftart (Arial, Times, Courier, etc.)
- **Schriftgröße**: in Punkt (pt)
- **Ausrichtung**: Links, Zentriert, Rechts
- **Ebene**: Vorder-/Hintergrund (z-index)

**Beispiel**:
```
Text: "URKUNDE"
Position: X=50%, Y=10%
Größe: 40% × 5%
Schrift: Arial Bold, 36pt
Ausrichtung: Zentriert
```

### 2.3 Datenbank-Feld hinzufügen

**Klicken Sie auf**: **"Datenbank-Feld hinzufügen"**

**Auswahl**:
- Dropdown mit allen 16 Datenbank-Feldern
- Wählen Sie z.B. "Name (Teilnehmer)"
- Feld wird als Platzhalter angezeigt: `{Name}`

**Formatierung**:
- Wie Text-Felder (Schrift, Position, Größe)
- Beim Druck: Platzhalter wird durch echte Daten ersetzt

**Beispiel-Workflow**:
1. Wähle Feld "Name" (Nr. 3)
2. Position: X=30%, Y=50%
3. Schrift: Arial, 18pt
4. Ausrichtung: Links
5. Beim Druck: `{Name}` → "Müller, Max"

### 2.4 Bild/Logo hinzufügen

**Klicken Sie auf**: **"Bild hinzufügen"**

**Upload**:
1. **Bild auswählen** (PNG, JPG, max. 5MB)
2. System lädt Bild hoch
3. Bild wird im Layout eingefügt

**Positionierung**:
- Drag & Drop im Canvas (direkt verschieben)
- Oder: X/Y-Koordinaten manuell setzen
- Größe anpassen (Breite/Höhe in %)

**Empfehlung**:
- **Vereins-Logo**: Links oben (X=5%, Y=5%)
- **Verbands-Logo**: Rechts oben (X=80%, Y=5%)
- **Hintergrund**: Wasserzeichen (Ebene=0, Transparenz)

**Unterstützte Formate**:
- PNG (empfohlen, transparent)
- JPG/JPEG (Hintergrund weiß)
- Max. Größe: 5MB

### 2.5 Felder anordnen

**Drag & Drop**:
- **Maus**: Elemente direkt im Canvas verschieben
- **Feintuning**: X/Y-Koordinaten manuell eingeben

**Ebenen (z-index)**:
- **0**: Hintergrund (Bilder, Wasserzeichen)
- **1**: Inhalte (Text, Datenfelder)
- **2**: Vordergrund (Logos, wichtige Texte)

**Ausrichtung**:
- **Links**: Typisch für Namen, Vereine
- **Zentriert**: Überschriften, Platzierungen
- **Rechts**: Selten, für spezielle Layouts

**Größe**:
- Relativ in % der Seitenbreite/-höhe
- Beispiel: 50% Breite = halbe Seite
- Auto-Skalierung beim PDF-Export

### 2.6 Vorschau & Speichern

**Vorschau**:
- Canvas zeigt Layout in Echtzeit
- Platzhalter `{Feldname}` sichtbar
- Echte Daten erst beim Druck

**Speichern**:
- **Automatisch** nach jeder Änderung (debounced)
- Änderungen werden sofort in Datenbank geschrieben
- Keine manuelle Speichern-Aktion nötig

**💡 Tipp**: Testen Sie Layout mit echten Daten (siehe Schritt 3)

---

## 📄 Schritt 3: Urkunden generieren

### 3.1 Ergebnisse öffnen

![Ergebnisse Übersicht](../images/ui-screenshots/results.png)

**Navigation**: Hauptmenü → **"Ergebnisse"**

**Filter**:
- **Event**: Wählen Sie Ihr Event
- **Wettkampf**: Einzelner Wettkampf oder alle
- **Platzierung**: Nur Platzierte (1-3) oder alle

### 3.2 Urkunden-Modus aktivieren

![Urkunden-Druck](../images/ui-screenshots/results_certificates.png)

**Tab "Urkunden"** anklicken

**Optionen**:
- **Layout auswählen**: Dropdown mit allen Layouts
- **Urkunden-Typ**:
  - ☑️ Siegerurkunden (Platz 1-3)
  - ☑️ Teilnehmer-Urkunden (Platz 4+)
- **Teilnehmer-Auswahl**:
  - Alle
  - Nur ausgewählte (Checkboxen)

### 3.3 Einzelne Urkunde generieren

**Für einen Teilnehmer**:
1. Checkbox beim Teilnehmer aktivieren
2. **"Urkunde generieren"** klicken
3. PDF öffnet sich in neuem Tab
4. Drucken (Strg+P) oder Speichern

**Vorschau prüfen**:
- Sind alle Daten korrekt?
- Passt das Layout?
- Keine Überlappungen?

### 3.4 Massen-Export (alle Urkunden)

**Für alle Teilnehmer**:
1. **"Alle auswählen"** Checkbox (oben)
2. **"Alle Urkunden generieren"** klicken
3. System generiert PDF mit allen Urkunden
4. Eine PDF-Datei mit mehreren Seiten

**Download**:
- PDF wird automatisch heruntergeladen
- Dateiname: `Urkunden_[Eventname]_[Datum].pdf`
- Speichern Sie Datei für Archiv

**Druck**:
- Öffnen Sie PDF
- Drucken Sie alle Seiten (Strg+P)
- Oder: Einzelne Seiten auswählen

**💡 Zeitersparnis**: 50 Teilnehmer = 1 PDF statt 50 einzelne!

---

## 🖨️ Schritt 4: Drucken

### 4.1 Drucker konfigurieren

**Empfohlene Einstellungen**:
- **Papier**: DIN A4 (Standard)
- **Ausrichtung**: Hochformat (Portrait)
- **Qualität**: Höchste (für schöne Urkunden)
- **Farbe**: Ja (falls Logo farbig)
- **Duplex**: Aus (einseitiger Druck)

### 4.2 Test-Druck

**Vor Wettkampf**:
1. Erstellen Sie Dummy-Teilnehmer
2. Generieren Sie Test-Urkunde
3. Drucken Sie auf normalem Papier
4. Prüfen Sie Layout, Abstände, Schriftgrößen

**Anpassungen** (falls nötig):
- Text zu groß? → Schriftgröße reduzieren
- Logo verrutscht? → Position anpassen
- Text abgeschnitten? → Feld-Breite erhöhen

### 4.3 Urkunden-Papier

**Empfehlung**:
- **Grammatur**: 120-160 g/m² (schwerer als Standard)
- **Farbe**: Weiß, Creme, oder mit Rand-Muster
- **Vorgedruckte Urkunden**: Möglich (TurnFix druckt nur Daten)

**Wo kaufen?**
- Online: Amazon, Sigel, Avery
- Lokal: Schreibwarenladen, Bürobedarf

### 4.4 Netzwerk-Druck

**Für größere Events**:
- **Zentral-Drucker**: Ein Drucker für alle Kampfrichter-Tablets
- **Drucker-Server**: Windows-Freigabe oder CUPS (Linux)
- **Konfiguration**: Siehe [Netzwerk-Setup](../deployment/network-setup.md)

**Workflow**:
1. Urkunden auf Server generieren
2. Auf Netzwerk-Drucker drucken
3. Urkunden-Ausgabe zentral organisieren

---

## 🎯 Tipps & Best Practices

### ✅ Do's

1. **Template-Bibliothek anlegen**
   - Standard-Layout für alle Events
   - Varianten für Gold/Silber/Bronze
   - Teilnahme-Urkunden

2. **Logos hochauflösend**
   - Mindestens 300 DPI
   - PNG mit Transparenz (kein weißer Rand)
   - Vektor-Grafiken wenn möglich (SVG → PNG konvertieren)

3. **Schriften lesbar**
   - Mindestens 12pt für Fließtext
   - 24-36pt für Überschriften
   - Klare Schriften (Arial, Calibri, Times)

4. **Ränder beachten**
   - Mind. 1cm Rand zur Papierkante
   - Drucker schneiden oft ab (besonders unten)
   - Wichtige Texte nicht am Rand platzieren

5. **Vorschau mit echten Daten**
   - Test-Teilnehmer mit langen Namen
   - Prüfen, ob Text komplett sichtbar
   - Verschiedene Platzierungen testen

### ❌ Don'ts

1. **Nicht zu viele Elemente**
   - Überladen wirkt unprofessionell
   - Fokus auf wichtige Informationen

2. **Keine zu kleinen Schriften**
   - < 10pt schwer lesbar
   - Besonders bei älteren Menschen

3. **Nicht zu viele Farben**
   - Maximal 2-3 Farben
   - Zu bunt wirkt unseriös

4. **Keine falschen Datenbank-Felder**
   - {Name} nicht für Veranstaltung nutzen!
   - Feld-Bedeutung beachten

---

## ❓ Häufige Probleme & Lösungen

### Problem 1: "Text wird abgeschnitten"

**Ursache**: Feld-Breite zu klein für langen Text

**Lösung**:
1. Layout-Editor öffnen
2. Feld auswählen
3. **Breite erhöhen** (z.B. 40% → 60%)
4. Speichern und neu generieren

### Problem 2: "Logo wird nicht angezeigt"

**Ursachen**:
- Bild nicht hochgeladen
- Bild zu groß (>5MB)
- Falsches Format

**Lösung**:
1. **Neues Bild hochladen**
   - PNG oder JPG
   - Max. 5MB
   - Komprimieren falls nötig (online-tools)
2. **Position prüfen**
   - Ist Bild außerhalb der Seite? (X/Y < 0 oder > 100)
3. **Ebene prüfen**
   - Ebene > 0 (sonst im Hintergrund)

### Problem 3: "Platzhalter {Name} bleibt im PDF"

**Ursache**: Datenbank-Feld nicht korrekt verknüpft

**Lösung**:
1. Layout-Editor öffnen
2. Feld löschen
3. **Neu hinzufügen** als Datenbank-Feld (nicht Text!)
4. Feld-Nr. 3 ("Name") auswählen
5. Speichern

**Code-Hintergrund**:
```typescript
// Feld muss als Typ "Datenbank-Feld" gespeichert sein
const field = {
  int_typ: 1,  // 0 = Text, 1 = Datenbank-Feld, 2 = Bild
  int_dbfeld: 3,  // Feld-Nr. 3 = "Name"
  var_value: null  // Leer bei Datenbank-Feldern
};

// Beim PDF-Generieren: Platzhalter ersetzen
const participantName = participant.var_nachname + ', ' + participant.var_vorname;
pdfText = pdfText.replace('{Name}', participantName);
```

### Problem 4: "PDF wird nicht generiert"

**Symptome**:
- Button "Urkunde generieren" reagiert nicht
- Fehler in Browser-Konsole

**Ursachen**:
- Teilnehmer hat keine Wertung
- Platzierung nicht berechnet
- Server-Fehler

**Lösung**:
1. **Browser-Konsole öffnen** (F12)
2. **Fehler lesen**:
   - "No scores found" → Wertungen fehlen
   - "Layout not found" → Layout wurde gelöscht
3. **Daten prüfen**:
   - Hat Teilnehmer Punkte?
   - Ist Platzierung gesetzt?
4. **Layout prüfen**:
   - Existiert ausgewähltes Layout?
   - Layout-Felder korrekt?

### Problem 5: "Unterschiedliche Layouts nicht verwendet"

**Problem**: Alle bekommen gleiche Urkunde (Sieger/Teilnehmer)

**Ursache**: Nur ein Layout ausgewählt

**Lösung**:
1. **Zwei Layouts erstellen**:
   - "Siegerurkunde" (für Platz 1-3)
   - "Teilnehmerurkunde" (für Platz 4+)
2. **Im Urkunden-Dialog**:
   - Sieger-Layout wählen für Platz 1-3
   - Teilnehmer-Layout für Rest
3. **Oder**: Logik im Code anpassen (für Entwickler)

**Code-Referenz** (für Entwickler):
```typescript
// Automatische Layout-Auswahl basierend auf Platzierung
const selectLayoutByRank = (rank: number) => {
  if (rank >= 1 && rank <= 3) {
    return winnerLayout;  // Siegerurkunde
  } else {
    return participantLayout;  // Teilnehmerurkunde
  }
};
```

---

## 🔧 Erweiterte Funktionen

### Bedingte Felder

**Zukünftiges Feature** (geplant):
- Felder nur anzeigen wenn Bedingung erfüllt
- Beispiel: "1. Platz" nur wenn `{Platz} == 1`
- Aktuell: Manuell in Code implementieren

### Mehrsprachige Urkunden

**Workaround**:
1. Layout für jede Sprache erstellen
2. "Urkunde DE", "Urkunde EN"
3. Beim Druck: Richtige Sprache wählen

**Zukünftig**: Automatische Übersetzung (i18n)

### QR-Code auf Urkunden

**Idee**: QR-Code zur Online-Verifizierung

**Umsetzung** (für Entwickler):
1. QR-Code als Bild generieren (npm: `qrcode`)
2. Bild in Layout einbinden
3. QR-Code verlinkt zu `/results/{participantId}`

**Beispiel-Code**:
```typescript
import QRCode from 'qrcode';

const generateQR = async (participantId: number) => {
  const url = `https://turnfix.app/results/${participantId}`;
  const qrDataUrl = await QRCode.toDataURL(url);
  return qrDataUrl;  // Als Bild in PDF einbetten
};
```

### Batch-Druck mit Sortierung

**Feature-Request**: Urkunden nach Verein sortieren

**Aktuell**:
- Sortierung manuell in Ergebnis-Liste
- Dann Massen-Export

**Zukünftig**: Automatische Sortierung (Checkbox)

---

## 📈 Nächste Schritte

Nach dem Urkunden-Druck:

1. **[Ergebnisse veröffentlichen](./results-export.md)**
   - Online-Ergebnislisten
   - Medaillenspiegel
   - Statistiken

2. **[Daten archivieren](../reference/data-backup.md)**
   - Datenbank-Backup
   - PDF-Archiv
   - Export für Verband

3. **[Event abschließen](../reference/event-completion.md)**
   - Status auf "Abgeschlossen" setzen
   - Aufräumen
   - Feedback sammeln

---

## 🔗 Verwandte Dokumentation

### Benutzer-Guides
- [Wertungserfassung](./score-capture.md)
- [Ergebnisse exportieren](./results-export.md)
- [Wettkämpfe verwalten](./event-competition-management.md)

### Developer-Guides
- [PDF-Generierung (pdfUtils)](../developer-guide/best-practices/pdf-generation.md)
- [Layout-System Architektur](../developer-guide/architecture/layout-system.md)
- [Datenbank-Felder Mapping](../developer-guide/reference/database-fields.md)

### Referenz
- [Urkunden-Papier Empfehlungen](../reference/certificate-paper.md)
- [Drucker-Konfiguration](../reference/printer-setup.md)
- [Legacy-Kompatibilität](../developer-guide/features/legacy-certificate-import.md)

---

## 📞 Support

**Probleme mit Urkunden?**

1. **Layout-Hilfe**: Info-Box im Layout-Editor (ℹ️)
2. **Test-Druck**: Immer vor Wettkampf testen!
3. **GitHub Issues**: [github.com/Igel18/turnfix/issues](https://github.com/Igel18/turnfix/issues)

---

**Version**: 2.0  
**Letzte Aktualisierung**: 05.11.2025  
**Autor**: TurnFix Team  
**Feedback**: Gerne als GitHub Issue einreichen!
