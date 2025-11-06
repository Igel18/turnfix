# Zeitplanung für Wettkämpfe

**Zielgruppe**: Wettkampfleiter, Event-Manager, Zeitplaner  
**Schwierigkeit**: ⭐⭐⭐ Fortgeschritten  
**Zeitaufwand**: 20-30 Minuten pro Event

---

## 📋 Übersicht

Die **Zeitplanung** ist das Herzstück der Wettkampf-Organisation. Sie ermöglicht:

- ✅ **Durchgänge (Sessions)** anlegen und verwalten
- ✅ **Startzeiten** für Wettkämpfe festlegen
- ✅ **Startgeräte** zuweisen (z.B. "Wettkampf beginnt am Boden")
- ✅ **Rotation** planen (automatischer Gerätewechsel)
- ✅ **Zeitplan** visualisieren (Gantt-Diagramm, Timeline)
- ✅ **Riegen-Management** koordinieren

**Wichtig**: Die Zeitplanung baut auf bereits angelegten [Wettkämpfen](./event-competition-management.md) auf!

---

## 🎯 Kernkonzepte verstehen

### 1. Durchgang (Session/Runde)

**Was ist ein Durchgang?**
- Ein **zeitlicher Block**, in dem eine oder mehrere Wettkämpfe parallel ablaufen
- Beispiel: "Durchgang 1: Samstag 09:00-12:00"

**Warum mehrere Durchgänge?**
- Unterschiedliche Altersgruppen zu verschiedenen Zeiten
- Tag 1 vs. Tag 2 bei mehrtägigen Events
- Vormittag vs. Nachmittag

**Code-Hintergrund**:
```typescript
interface Competition {
  round: number;        // Durchgang (1, 2, 3, ...)
  startTime: string;    // "09:00" (HH:MM)
  startDate: string;    // "2025-11-06" (YYYY-MM-DD)
  warmupTime: string;   // "08:30" (Einturnen)
}
```

### 2. Startgerät (Start Device)

**Was ist ein Startgerät?**
- Das **erste Gerät**, an dem ein Wettkampf/eine Riege beginnt
- Bestimmt die **Rotationsreihenfolge**

**Beispiel Männer (6 Geräte)**:
- Riege A startet am **Boden** → Rotation: Bo → Pf → Ri → Sp → Ba → Re
- Riege B startet am **Reck** → Rotation: Re → Bo → Pf → Ri → Sp → Ba

**Unterschied: Bahn vs. Startgerät** (Point 133):
- **Bahn** (`int_bahn`): Logische Gruppierung (veraltet, nur für Legacy-Kompatibilität)
- **Startgerät**: Tatsächliches Gerät zum Start (modern, flexibel)

### 3. Riege (Squad)

**Was ist eine Riege?**
- Eine **Gruppe von Teilnehmern**, die gemeinsam durch die Geräte rotiert
- Kann Teilnehmer aus **mehreren Wettkämpfen** enthalten

**Vorteile**:
- Bessere Auslastung der Geräte
- Gemeinsame Rotation spart Zeit
- Übersichtlichere Zeitplanung

### 4. Rotation

**Was ist Rotation?**
- Der **automatische Wechsel** zwischen Geräten nach festgelegter Zeit
- Alle Riegen wechseln gleichzeitig

**Zeiteinstellungen**:
- **Übungsdauer**: Zeit pro Athlet am Gerät (Standard: 3 Min.)
- **Pause zwischen Geräten**: Wechselzeit (Standard: 0 Min.)
- **Aufwärmzeit**: Einturnen vor Wettkampf (Standard: 15 Min.)
- **Rotationsintervall**: Gesamtzeit pro Gerät (Standard: 20 Min.)

---

## ✅ Voraussetzungen

Bevor Sie die Zeitplanung nutzen:

1. ✅ **Wettkämpfe erstellt** - Siehe [Wettkämpfe verwalten](./event-competition-management.md)
2. ✅ **Disziplinen zugewiesen** - Jeder Wettkampf hat Disziplinen
3. ✅ **Teilnehmer zugeordnet** - Wettkämpfe haben Teilnehmer
4. ✅ **(Optional) Riegen gebildet** - Siehe [Riegen-Management](../reference/squad-management.md)

---

## 🚀 Schritt 1: Zeitplanung öffnen

### 1.1 Navigation

1. Wählen Sie Ihr **Event** im Event-Selector (oben rechts)
2. Klicken Sie auf **"Zeitplanung"** im Hauptmenü
3. Die Zeitplanung lädt automatisch alle Wettkämpfe des Events

### 1.2 Ansichten

Die Zeitplanung bietet **4 verschiedene Ansichten**:

| Ansicht | Symbol | Verwendung |
|---------|--------|------------|
| **Durchgänge** | 📋 | Übersicht aller Sessions mit Wettkämpfen (Standard) |
| **Zeitstrahl** | ⏱️ | Timeline-Ansicht (linear) |
| **Gantt** | 📊 | Gantt-Diagramm mit zeitlichen Balken |
| **Rotation** | 🔄 | Rotationsplan mit Gerätewechseln |

**Umschalten**: Klicken Sie auf die Buttons oben rechts

---

## 📅 Schritt 2: Durchgänge verwalten

### 2.1 Durchgang hinzufügen

![Durchgänge Übersicht](../images/ui-screenshots/time-planning-sessions.png)

**Klicken Sie auf**: **"+ Durchgang hinzufügen"** (Header-Bereich)

**Was passiert?**
- Ein neuer **leerer Durchgang** wird angelegt
- Sie können Wettkämpfe per Drag & Drop zuweisen
- Durchgangs-Nummer wird automatisch vergeben

**Code-Hintergrund**:
```typescript
// Neuer Durchgang wird als "extraRound" im State gehalten
// bis Wettkämpfe zugewiesen werden
const [extraRounds, setExtraRounds] = useState<number[]>([]);

// Beim Speichern: Backend aktualisiert tfx_wettkampf.int_durchgang
await apiPut(`/time-planning/competition/${compId}/round`, { 
  round: newRound 
});
```

### 2.2 Wettkampf einem Durchgang zuweisen

**Methode 1: Drag & Drop**
1. Klicken Sie auf einen Wettkampf (halten Sie die Maustaste gedrückt)
2. Ziehen Sie ihn in einen anderen Durchgang
3. Loslassen - Wettkampf wird verschoben

**Methode 2: Bearbeiten-Dialog**
1. Klicken Sie auf das **Bearbeiten-Symbol** (✏️) beim Wettkampf
2. Ändern Sie **"Durchgang"** in der Dropdown-Liste
3. Speichern

### 2.3 Startzeit festlegen

![Startzeit bearbeiten](../images/ui-screenshots/time-planning-edit.png)

**Für jeden Wettkampf**:

1. Klicken Sie auf das **Uhr-Symbol** (🕐) oder **Stift-Symbol** (✏️)
2. Bearbeiten Sie:
   - **Startdatum**: Tag des Wettkampfs (YYYY-MM-DD)
   - **Startzeit**: Beginn (HH:MM, z.B. "09:00")
   - **Aufwärmzeit**: Einturnen (HH:MM, z.B. "08:30")
3. Klicken Sie **"Speichern"**

**💡 Tipp**: 
- Setzen Sie die **Startzeit für den ersten Wettkampf** im Durchgang
- Andere Wettkämpfe können parallel oder nacheinander laufen

**Code-Referenz**:
```typescript
// Zeit-Felder werden in LOCAL timezone gespeichert
const competition = {
  startDate: '2025-11-06',     // Datum
  startTime: '09:00',          // Startzeit (lokal)
  warmupTime: '08:30'          // Aufwärmzeit (lokal)
};

// Backend: tfx_wettkampf
// dat_datum (DATE)
// tim_startzeit (TIME without timezone)
// tim_einturnen (TIME without timezone)
```

---

## 🎯 Schritt 3: Startgeräte zuweisen

### 3.1 Warum Startgeräte wichtig sind

**Ohne Startgeräte**:
- ❌ Keine automatische Rotation möglich
- ❌ Rotationsplan kann nicht generiert werden
- ❌ Zeitplan unvollständig

**Mit Startgeräten**:
- ✅ Automatische Berechnung der Gerätewechsel
- ✅ Gantt-Diagramm zeigt alle Geräte
- ✅ Rotationsplan vollständig

### 3.2 Startgeräte festlegen

**Variante 1: Pro Wettkampf (Legacy)**
1. Bearbeiten Sie den Wettkampf (✏️)
2. Feld **"Bahn"** - veraltet, nicht empfohlen
3. Besser: Verwenden Sie Riegen!

**Variante 2: Pro Riege (Empfohlen)** ⭐

1. Klicken Sie auf **"Startgeräte bearbeiten"** beim Durchgang
2. Für jede Riege:
   - Wählen Sie **Startgerät** aus Dropdown (z.B. "Boden", "Reck")
3. Speichern

![Startgeräte Editor](../images/ui-screenshots/start-devices-editor.png)

**Beispiel-Konfiguration**:
```
Durchgang 1 (09:00-12:00):
├─ Riege A (Männlich AK 12-13)
│  └─ Startgerät: Boden → Rotation: Bo, Pf, Ri, Sp, Ba, Re
├─ Riege B (Männlich AK 14-15)  
│  └─ Startgerät: Reck → Rotation: Re, Bo, Pf, Ri, Sp, Ba
└─ Riege C (Weiblich AK 12-13)
   └─ Startgerät: Sprung → Rotation: Sp, Stu, Bal, Bo
```

**Code-Hintergrund**:
```typescript
// Startgeräte werden in tfx_riegen_disziplinen gespeichert
interface SquadDiscipline {
  int_riegenid: number;          // Riegen-ID
  int_disziplinenid: number;     // Disziplin-ID (z.B. Boden)
  int_startgeraet: number;       // 1 = Startgerät, 0 = nicht
  int_reihenfolge: number;       // Rotationsreihenfolge (1, 2, 3, ...)
}

// API: PUT /api/time-planning/squad/{squadId}/start-device
```

### 3.3 Automatische Rotation

Nach Festlegung der Startgeräte:

1. System berechnet automatisch **Rotationsreihenfolge**
2. Wechselzeiten werden basierend auf Zeiteinstellungen kalkuliert
3. Gantt-Diagramm zeigt alle Geräte-Belegungen

---

## ⏱️ Schritt 4: Zeiteinstellungen konfigurieren

### 4.1 Zeit-Einstellungen öffnen

Klicken Sie auf **Zahnrad-Symbol** (⚙️) "Zeiteinstellungen"

### 4.2 Parameter anpassen

![Zeiteinstellungen](../images/ui-screenshots/time-settings.png)

| Parameter | Beschreibung | Standard | Empfehlung |
|-----------|--------------|----------|------------|
| **Übungsdauer** | Zeit pro Athlet am Gerät | 3 Min. | 2-4 Min. |
| **Pause zwischen Geräten** | Wechselzeit | 0 Min. | 0-2 Min. |
| **Aufwärmzeit** | Einturnen vor Wettkampf | 15 Min. | 10-20 Min. |
| **Rotationsintervall** | Gesamtzeit pro Gerät | 20 Min. | 15-25 Min. |

**💡 Berechnung**:
```
Rotationsintervall = 
  (Übungsdauer × Anzahl Teilnehmer) + 
  Pause zwischen Geräten + 
  Puffer
```

**Beispiel**:
- 8 Teilnehmer × 3 Min. = 24 Min.
- + 0 Min. Pause = 24 Min.
- → Empfehlung: **25 Min. Rotationsintervall** (1 Min. Puffer)

### 4.3 Änderungen speichern

1. Klicken Sie **"Speichern"**
2. System berechnet Zeitplan neu
3. Gantt-Diagramm wird aktualisiert

**Code-Referenz**:
```typescript
interface TimeSettings {
  exerciseDurationMinutes: number;      // Übungsdauer
  breakBetweenDevicesMinutes: number;   // Pause
  warmupDurationMinutes: number;        // Aufwärmen
  rotationIntervalMinutes: number;      // Intervall
}

// Zeitberechnung im Frontend
const addMinutesToTime = (time: string, minutes: number): string => {
  const [hours, mins] = time.split(':').map(Number);
  const date = new Date(1970, 0, 1, hours, mins);
  date.setMinutes(date.getMinutes() + minutes);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};
```

---

## 📊 Schritt 5: Visualisierungen nutzen

### 5.1 Durchgänge-Ansicht (Standard)

![Durchgänge Ansicht](../images/ui-screenshots/time-planning-sessions.png)

**Zeigt**:
- Alle Durchgänge als Karten
- Wettkämpfe pro Durchgang
- Startzeiten und Riegen
- Drag & Drop möglich

**Verwendung**: Übersicht und Organisation

### 5.2 Gantt-Diagramm

![Gantt-Ansicht](../images/ui-screenshots/time-planning-gantt.png)

**Zeigt**:
- Zeitliche Balken für jeden Wettkampf
- Überlappungen und Parallelen
- Geräte-Belegungen (wenn Startgeräte gesetzt)

**Verwendung**: Zeitliche Planung, Konflikt-Erkennung

**Interaktion**:
- Scrollen: Zeitachse verschieben
- Zoom: Zeitbereich anpassen (Slider oben)
- Startzeit/Endzeit: Sichtbarer Zeitbereich festlegen

### 5.3 Rotationsplan

![Rotationsplan](../images/ui-screenshots/time-planning-rotation.png)

**Zeigt**:
- Gerätewechsel für alle Riegen
- Zeitfenster pro Gerät
- Aufwärmzeiten (hell markiert)
- Farbcodierung pro Riege

**Verwendung**: 
- Aushang für Teilnehmer
- Kampfrichter-Zuteilung
- Zeitkontrolle während Wettkampf

**Code-Hintergrund**:
```typescript
interface DeviceSchedule {
  squadName: string;      // Riegen-Name
  deviceName: string;     // Gerätename (z.B. "Boden")
  startTime: string;      // Startzeit (HH:MM)
  endTime: string;        // Endzeit (HH:MM)
  competition: string;    // Wettkampf-Name
  isWarmup: boolean;      // Aufwärmzeit? (true/false)
  isFirstDevice?: boolean; // Erstes Gerät? (markiert)
}

// Berechnung: calculateDeviceSchedule()
// Algorithmus:
// 1. Für jede Riege: Startgerät finden
// 2. Rotationsreihenfolge bestimmen
// 3. Zeiten berechnen (Intervall × Geräte-Index)
// 4. Aufwärmzeit vor erstem Gerät
```

### 5.4 Timeline-Ansicht

**Zeigt**:
- Linearer Zeitstrahl (nicht hierarchisch)
- Alle Wettkämpfe chronologisch
- Einfache Übersicht

**Verwendung**: Schneller Tagesüberblick

---

## 🔄 Schritt 6: Rotationsplan erstellen

### 6.1 Voraussetzungen prüfen

Für einen vollständigen Rotationsplan brauchen Sie:
- ✅ Wettkämpfe mit Startzeiten
- ✅ Riegen gebildet (oder automatisch aus Wettkämpfen generiert)
- ✅ Startgeräte zugewiesen
- ✅ Zeiteinstellungen konfiguriert

### 6.2 Rotationsplan generieren

**Automatisch**:
1. Wechseln Sie zur **"Rotation"**-Ansicht
2. System berechnet automatisch:
   - Gerätewechsel
   - Zeitfenster
   - Aufwärmzeiten

**Manuell anpassen**:
- Aktuell nur über Startgeräte-Editor möglich
- Zukünftig: Direktes Bearbeiten im Rotationsplan (geplant)

### 6.3 Rotationsplan exportieren

**Option 1: Drucken**
1. Rotation-Ansicht öffnen
2. Browser-Druckfunktion (Strg+P)
3. Als PDF speichern

**Option 2: Screenshot**
- Für Aushang an der Wettkampfstätte

**Option 3: API-Export** (für Entwickler)
```typescript
// Rotationsdaten als JSON abrufen
const rotation = await apiGet(`/time-planning/rotation?eventId=${eventId}`);
```

---

## 🎯 Tipps & Best Practices

### ✅ Do's

1. **Zeitpuffer einplanen**
   - Rotationsintervall > (Teilnehmer × Übungsdauer)
   - Mindestens 2-3 Min. Puffer pro Gerät

2. **Realistische Zeiten**
   - ✅ Einturnen: 10-20 Min. (nicht zu knapp!)
   - ✅ Übungsdauer: 2-4 Min. pro Athlet
   - ✅ Rotationsintervall: 20-30 Min. für Breitensport

3. **Durchgänge sinnvoll gruppieren**
   - Ähnliche Altersgruppen zusammen
   - Männer und Frauen getrennt (unterschiedliche Geräte)
   - Vormittag/Nachmittag trennen

4. **Startgeräte verteilen**
   - Nicht alle Riegen am gleichen Gerät starten
   - Gleichmäßige Verteilung über alle Geräte
   - Beispiel: 6 Riegen → je 1 Riege pro Gerät

5. **Riegen optimal nutzen**
   - 4-8 Teilnehmer pro Riege (ideal)
   - Wettkämpfe mischen für bessere Auslastung
   - Siehe [Riegen-Management](../reference/squad-management.md)

### ❌ Don'ts

1. **Keine unrealistischen Zeitfenster**
   - ❌ 2 Min. Rotationsintervall für 10 Teilnehmer
   - ❌ 5 Min. Aufwärmzeit

2. **Nicht zu viele parallele Wettkämpfe**
   - Kampfrichter-Kapazität beachten
   - Maximal so viele wie Geräte verfügbar

3. **Keine überlappenden Durchgänge**
   - Durchgang 1 sollte fertig sein, bevor Durchgang 2 startet
   - Ausnahme: Bewusst geplante Parallelen

4. **Startgeräte nicht vergessen**
   - Ohne Startgeräte kein Rotationsplan!
   - Immer für alle Riegen setzen

---

## ❓ Häufige Probleme & Lösungen

### Problem 1: "Rotationsplan ist leer"

**Ursachen**:
- Keine Startgeräte zugewiesen
- Keine Riegen gebildet
- Keine Startzeiten gesetzt

**Lösung**:
1. Prüfen Sie **Startgeräte-Editor**
2. Weisen Sie jeder Riege ein Startgerät zu
3. Speichern und Rotation neu laden

### Problem 2: "Zeiten passen nicht"

**Ursache**: Rotationsintervall zu kurz/lang

**Lösung**:
1. Öffnen Sie **Zeiteinstellungen** (⚙️)
2. Passen Sie **Rotationsintervall** an
3. Formel: `(Teilnehmer × Übungsdauer) + Puffer`
4. Speichern → Zeiten werden neu berechnet

### Problem 3: "Wettkampf wird nicht angezeigt"

**Ursachen**:
- Wettkampf hat keinen Durchgang
- Wettkampf hat keine Teilnehmer
- Event-Filter aktiv

**Lösung**:
1. Prüfen Sie Wettkampf-Daten (Durchgang gesetzt?)
2. Weisen Sie Durchgang zu (Drag & Drop oder Bearbeiten)
3. Prüfen Sie Event-Selector (richtiges Event gewählt?)

### Problem 4: "Riegen fehlen in Rotation"

**Ursache**: Riegen nicht korrekt angelegt oder Wettkämpfen zugeordnet

**Lösung**:
1. Gehen Sie zu **Riegen-Management**
2. Erstellen Sie Riegen manuell oder automatisch
3. Ordnen Sie Wettkämpfe zu
4. Zurück zur Zeitplanung → Aktualisieren

### Problem 5: "Gantt-Diagramm zeigt keine Balken"

**Ursachen**:
- Startzeiten nicht gesetzt
- Zeitbereich außerhalb der Wettkampfzeiten

**Lösung**:
1. Setzen Sie **Startzeiten** für alle Wettkämpfe
2. Passen Sie **Gantt-Zeitbereich** an (Slider oben)
3. Standard: 07:00-18:00 → erweitern falls nötig

---

## 🔧 Erweiterte Funktionen

### Live-Zeitplanung während Wettkampf

**Real-time Updates** (Point 109):
- Änderungen werden sofort an alle Clients gesendet
- Kampfrichter sehen aktuelle Rotation
- Zeitplan passt sich automatisch an

**Socket.io Integration**:
```typescript
// Bei Änderung: Server sendet Update
socket.emit('time-planning-updated', { eventId, data });

// Client empfängt und aktualisiert
socket.on('time-planning-updated', (data) => {
  if (data.eventId === selectedEvent.int_eventid) {
    refetch(); // Daten neu laden
  }
});
```

### Bahn-Konzept (Point 121)

**Legacy-Feature** für alte Datenbank-Kompatibilität:
- `int_bahn` in `tfx_wettkampf` (veraltet)
- Ersetzt durch flexibles **Startgeräte-System**
- Nur noch für Import alter Daten relevant

**Migration**:
```sql
-- Alt: Bahn-basiert (starr)
UPDATE tfx_wettkampf SET int_bahn = 1;

-- Neu: Startgeräte-basiert (flexibel)
INSERT INTO tfx_riegen_disziplinen (int_riegenid, int_disziplinenid, int_startgeraet)
VALUES (1, 74, 1); -- Riege 1 startet an Boden (ID 74)
```

### Manuelle Zeitanpassungen

**Spezialfall**: Nicht alle Riegen starten zur gleichen Zeit

**Lösung**:
1. Erstellen Sie separate Durchgänge
2. Oder: Bearbeiten Sie Startzeiten individuell
3. Rotationsplan berücksichtigt unterschiedliche Startzeiten

---

## 📈 Nächste Schritte

Nach der Zeitplanung:

1. **[Riegen-Management](../reference/squad-management.md)**
   - Riegen optimieren
   - Teilnehmer umverteilen
   - Startnummern anpassen

2. **[Kampfrichter-Portal einrichten](./jury-setup.md)**
   - Zugänge erstellen
   - Geräte zuweisen
   - Test-Wertungen durchführen

3. **[Wertungserfassung vorbereiten](./score-capture.md)**
   - Tablets/Laptops konfigurieren
   - Netzwerk testen
   - Offline-Modus aktivieren (falls nötig)

4. **[Rotationsplan aushängen](./results-export.md)**
   - PDF exportieren
   - Drucken und anschlagen
   - QR-Code für digitale Ansicht (optional)

---

## 🔗 Verwandte Dokumentation

### Benutzer-Guides
- [Wettkämpfe verwalten](./event-competition-management.md)
- [Riegen-Management](../reference/squad-management.md)
- [Kampfrichter-Portal](./jury-setup.md)
- [Wertungserfassung](./score-capture.md)

### Developer-Guides
- [Point 109: Zeitplanung UI-Verbesserungen](../developer-guide/features/point-109-time-planning.md)
- [Point 121: Bahn-Konzept](../developer-guide/features/point-121-rotation-bahn.md)
- [Point 133: Startgeräte-System](../developer-guide/features/point-133-bahn-concept.md)
- [Point 135: Startgeräte-Verwaltung](../developer-guide/features/point-135-start-devices.md)
- [Time Planning API](../developer-guide/api/time-planning.md)

### Referenz
- [Disziplinen-Übersicht](../reference/disciplines.md)
- [Zeitzone-Handling](../developer-guide/best-practices/timezone-handling.md)
- [Socket.io Real-time Updates](../developer-guide/architecture/socket-io.md)

---

## 📞 Support

**Probleme bei der Zeitplanung?**

1. **Hilfe-Button** (ℹ️) in der Zeitplanung-Ansicht
2. **Dokumentation durchsuchen**: [TurnFix Docs](../README.md)
3. **GitHub Issues**: [github.com/Igel18/turnfix/issues](https://github.com/Igel18/turnfix/issues)

---

**Version**: 2.0  
**Letzte Aktualisierung**: 05.11.2025  
**Autor**: TurnFix Team  
**Feedback**: Gerne als GitHub Issue einreichen!
