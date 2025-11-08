# Formeln verwalten

## Übersicht

Formeln definieren Berechnungsregeln für Gesamtnoten aus einzelnen Wertungskomponenten (z.B. E-Note + D-Note - Abzüge).

## Zugriff

**URL**: `http://localhost:5173/formulas`

## Funktionen

### Formel erstellen

**Formular**:
- **Name**: Bezeichnung (z.B. "E+D-System")
- **Formel**: Berechnungsausdruck
- **Beschreibung**: Erklärung

### Formel-Syntax

**Grundrechenarten**:
- `+` Addition
- `-` Subtraktion  
- `*` Multiplikation
- `/` Division
- `%` Modulo (Rest bei Division)
- `()` Klammern für Priorität

**Vergleichsoperatoren**:
- `=` Gleich
- `!=` Ungleich
- `<` Kleiner als
- `<=` Kleiner oder gleich
- `>` Größer als
- `>=` Größer oder gleich

**Logische Operatoren**:
- `&` Logisches UND
- `|` Logisches ODER
- `!` Logisches NICHT

**Grundfunktionen**:
- `abs(x)` - Absolutwert
- `sqrt(x)` - Quadratwurzel
- `cbrt(x)` - Kubikwurzel (dritte Wurzel)
- `pow(x,y)` - Potenz (x hoch y)
- `exp(x)` - Exponentialfunktion (e^x)
- `exp2(x)` - Zweierexponentialfunktion (2^x)

**Rundungsfunktionen**:
- `floor(x)` - Abrunden zur nächsten ganzen Zahl
- `ceil(x)` - Aufrunden zur nächsten ganzen Zahl
- `int(x)` - Ganzzahlanteil (Nachkommastellen abschneiden)
- `trunc(x)` - Abschneiden (wie int)

**Logarithmen**:
- `log(x)` - Natürlicher Logarithmus (ln)
- `log10(x)` - Logarithmus zur Basis 10
- `log2(x)` - Logarithmus zur Basis 2

**Trigonometrische Funktionen** (Eingabe in Radiant oder Grad):
- `sin(x)` - Sinus
- `cos(x)` - Kosinus
- `tan(x)` - Tangens
- `cot(x)` - Kotangens
- `sec(x)` - Sekans (1/cos(x))
- `csc(x)` - Kosekans (1/sin(x))

**Inverse trigonometrische Funktionen** (Ergebnis: Winkel):
- `asin(x)` - Arkussinus
- `acos(x)` - Arkuskosinus
- `atan(x)` - Arkustangens
- `atan2(y,x)` - Arkustangens mit zwei Argumenten (berücksichtigt Vorzeichen)

**Hyperbolische Funktionen**:
- `sinh(x)` - Sinus hyperbolicus
- `cosh(x)` - Kosinus hyperbolicus
- `tanh(x)` - Tangens hyperbolicus
- `asinh(x)` - Area Sinus hyperbolicus (inverse)
- `acosh(x)` - Area Kosinus hyperbolicus (inverse)
- `atanh(x)` - Area Tangens hyperbolicus (inverse)

**Vergleichs- und Auswahlefunktionen**:
- `min(x,y)` - Minimum von zwei Werten
- `max(x,y)` - Maximum von zwei Werten
- `hypot(x,y)` - Hypotenuse (√(x²+y²))
- `if(bedingung,dann,sonst)` - Bedingte Auswahl

**Variablen**: Feldnamen in GROSSBUCHSTABEN
- `E_NOTE` - E-Note Feld
- `D_NOTE` - D-Note Feld
- `ABZUEGE` - Abzüge Feld
- Eigene Feldnamen je nach Disziplin

## Beispiele

**E+D-System (Gerätturnen)**:
```
E_NOTE + D_NOTE - ABZUEGE
```

**Bedingte Formel (Bonus ab 9.0 E-Note)**:
```
if(E_NOTE >= 9.0, E_NOTE + D_NOTE + BONUS - ABZUEGE, E_NOTE + D_NOTE - ABZUEGE)
```

**Durchschnitt aus 4 Noten**:
```
(NOTE1 + NOTE2 + NOTE3 + NOTE4) / 4
```

**Durchschnitt mit Minimum (keine negative Punktzahl)**:
```
max((E1_NOTE + E2_NOTE + E3_NOTE) / 3 - ABZUEGE, 0)
```

**Komplexe Berechnung mit Ganzzahl**:
```
int((D_NOTE + E_NOTE - ABZUEGE) * 100) / 100
```

**Gewichtete Bewertung**:
```
TECHNIK * 0.6 + AUSFUEHRUNG * 0.4
```

**Minimum/Maximum Beispiele**:
```
min(E_NOTE, D_NOTE)
max(PUNKTE - ABZUEGE, 0)
```

**Kubikwurzel-Berechnung**:
```
cbrt(VOLUMEN)
```

**Trigonometrie (Winkelberechnungen)**:
```
sin(WINKEL) + cos(WINKEL)
```

## Verwendung

Formeln werden in **Disziplinfeldern** zugeordnet:
1. Gehe zu Disziplinfelder
2. Wähle "Berechnetes Feld"
3. Ordne Formel zu
4. System berechnet automatisch bei Wertungserfassung

## Technische Details

**Datenbank-Tabelle**: `tfx_formeln`

**API**: `/api/formulas`

## Siehe auch

- [Disziplinfelder verwalten](discipline-fields.md)
- [Score Capture](../score-capture.md)
