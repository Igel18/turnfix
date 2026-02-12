
1. Im DB Setup 
http://localhost:3001/configuration

muss mit einem "zurückgesetzen" UI begonnen werden. 

2. Im DB Setup 
http://localhost:3001/configuration
Gibt es diese Fehler: 

Produktions-Disziplinen importieren
Optional

Importiert alle 139 Disziplinen aus 12 Sportarten (Turnen, Leichtathletik, Schwimmen, etc.) - Empfohlen!
⏳ Produktions-Disziplinen werden importiert...
❌ Fehler: 
Invalid `prisma.tfx_disziplinen.create()` invocation:


The provided value for the column is too long for the column's type. Column: (not available)
Invalid `prisma.tfx_disziplinen.create()` invocation: The provided value for the column is too long for the column's type. Column: (not available)

GymNet-Voreinstellungen
Optional

Befüllt die Datenbank mit 60+ Geräten, Formeln und Feldern für GymNet-Import (optional)
⏳ GymNet-Voreinstellungen werden angewendet...
❌ Fehler: 
Invalid `prisma.tfx_disziplinen.create()` invocation:


The provided value for the column is too long for the column's type. Column: (not available)
Invalid `prisma.tfx_disziplinen.create()` invocation: The provided value for the column is too long for the column's type. Column: (not available)

3. Im DB Setup 
http://localhost:3001/configuration
müssen für den Setup assistenten Tests geschrieben werden. 

4. In dem Export PDF von Siegerlisten muss auch immer die Formel angezeigt werden. 
Da jeder Teilnehmer in einem Wettkampf immer die gleiche Formel an einem Gerät hat reicht das in der Überschrift. 

5. Bezüglich den Formeln wäre eine kompakere darstellung schön. 