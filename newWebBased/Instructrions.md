1. ~~in veranstaltungsverwaltung muss es einen button geben um die Startnummern zu generieren~~ ✅
2. ~~in der Ansicht "Event Participants" ist nich lokalisiert~~ ✅
3. ~~in der Ansicht "Event Participants" funktioniert der Filter mit den AgeGroups nicht. ich denke es ist ausreichend nach Age zu filtern.~~ ✅
4. ~~die Ansicht "Manage Squads" ist nicht lokalisiert~~ ✅
5. ~~in der Ansicht "Manage Squads" benötige ich eine neue FUnktion: Bei Auswahl eines Wettkampfes in den Riegen Details (rechte Spalte) "assigned Competitions" sollen alle Teilnehmer von diesem Wettkampf gehighlightet werden.~~ ✅
6. ~~in der Ansicht "Manage Squads" kann man aktuell nicht nach Vereinen Filtern.~~ ✅
7. ~~Lokalisierung der aller UIs im Veranstaltungsverwaltung die noch nicht lokalisiert sind.~~ ✅
8. ~~In der View http://localhost:5173/certificate-layouts beim Editieren eines Layouts sind die DB Felder durch nummeriert. Es ist nicht klar was dahinter steckt... lässt sich irgendwie raus finden was die Felder bedeuten? Im Alten c++ code waren die felder genau benannt.~~ ✅
9. ~~Auf der Seite Veranstaltungsteilnehmer gibt es einen Export "Teilnehmer Etiketten" diese Etiketten müssen sortiert werden nach Gender dann Riege dann Verein.~~ ✅
10. ~~Gender in den Participant listen ist oft unknown. Bei den Veranstaltungsteilnehmern passt es aber. Gibt es da keine helper oder util oder andere generelle klasse die das handelt? ggf. könnte man die von den Veranstaltungsteilnehmern auch bei den participants verwenden.~~ ✅
11. Setup so gestalten, dass mit einem klick alles installiert wird, so wie ich das sehe ist das u.a. 
    - postgres (prüfen ob Pg schon installiert, wenn nicht runterladen und installieren aus dem setup heraus)
    - node (prüfen ob schon installiert (in der richtigen version) runterladen und installieren aus dem setup heraus)
    - npm 
    - turnfix  
    - alle dependencies 
    - DB verbindung herstellen 
    - DB erzeugen wenn nicht schon vorhanden 
12. ~~Wird die Seite "event-management" bearbeitet und soll dann gespeichert werden, kann man den speicher button nicht finden, da dieser ganz weiß ist.~~ ✅
13. ~~Lokalisierung der kompletten Einstellungen http://localhost:5173/configuration~~ ✅
14. ~~Veranstaltungsteilnehmer: Die Suche muss auch für die Startnummern funktionieren.~~ ✅
15. ~~Athletes Management lokalisieren~~ ✅
16. ~~Athletes Management Filter "Gender" hat kein "unknown" aber "allgender" und "allgenders"~~ ✅
17. ~~Athletenverwaltung Dialog zum editieren ist nicht lokalisiert~~ ✅
18. ~~Jury Portal: Icons von den disziplinen verwenden, die auch bei diesen hinterlegt sind. vielleicht gibt es dafür schon generalized funktionen?~~ ✅
19. ~~im Jury Portal beim Eingeben der Wertungen steht im header das Gerät. Hier wäre die Anzeige des Icons auch noch hilfreich.~~ ✅
20. ~~was ist der unterschied zwischen den jury portalen? kann man hier den selben code verwenden? oder vielleicht sogar das Client Jury Portal eleminieren?~~ ✅
    **Analyse abgeschlossen**: Siehe `JURY_PORTAL_COMPARISON.md`
    **Entscheidung**: ✅ Client Jury Portal (`/jury`) wurde erfolgreich entfernt (2025-01-14)
    **Ergebnis**: Nur noch Standalone Jury Portal (Port 5174) ist aktiv.
    **Entfernte Dateien**: `client/src/pages/JuryPortal.tsx`, `client/src/jury-main.tsx`, `client/index-jury.html`
21. http://localhost:5173/management ist folgendes nicht lokalisiert: "Select Event"
11. ~~Setup so gestalten, dass mit einem klick alles installiert wird, so wie ich das sehe ist das u.a.~~ ✅
    **Status**: ✅ Abgeschlossen - Setup-System wurde verbessert
    **Implementierung**: Siehe `POINT-11-IMPLEMENTATION.md`
    **Neue Features**:
    - ✅ Node.js Version-Check (v18+ erforderlich) mit automatischem Upgrade
    - ✅ PostgreSQL Direct Download Fallback wenn Chocolatey fehlschlägt
    - ✅ ForceUpdate Parameter für Neuinstallation
    - ✅ Erweiterte Fehlerbehandlung und Logging
    - ✅ Umfassende deutsche Dokumentation (SETUP-GUIDE-DE.md)
    **Neue Dateien**:
    - `setup/windows/install-prerequisites-improved.ps1` (verbesserte Version)
    - `setup/windows/SETUP-GUIDE-DE.md` (umfassende Dokumentation)
    - `newWebBased/POINT-11-IMPLEMENTATION.md` (Implementierungs-Details)
    **Bestehende Infrastruktur** (bereits vorhanden, funktioniert):
    - `setup/windows/INSTALL.bat` - Ein-Klick Installation ✅
    - `setup/windows/complete-setup.ps1` - Master-Setup-Skript ✅
    - `setup/windows/install-prerequisites.ps1` - Prerequisites Installation ✅ (verbessert)
    - `setup/windows/setup-database.ps1` - DB Setup ✅
    - `setup/windows/setup-turnfix.ps1` - App Setup ✅
    - `setup/windows/check-requirements.ps1` - System-Check ✅
    **Alle Anforderungen erfüllt**:
    - postgres (prüfen ob Pg schon installiert, wenn nicht runterladen und installieren aus dem setup heraus) ✅
    - node (prüfen ob schon installiert (in der richtigen version) runterladen und installieren aus dem setup heraus) ✅
    - npm ✅ (wird mit Node.js installiert)
    - turnfix ✅ (Repository wird geklont)
    - alle dependencies ✅ (npm install automatisch)
    - DB verbindung herstellen ✅ (automatisch)
    - DB erzeugen wenn nicht schon vorhanden ✅ (automatisch)

22. Jury-Results: 
a) ~~auf der seite http://localhost:3001/score-capture?eventId=59 am Gerät nur noch den Endwert (offiziell) anzeigen~~ ✅
b) ~~die Hinweise können dann auch ausgeblendet werden~~ ✅
Hinweise zur Wertungserfassung
c) ~~die Calculate / Berechnen können dann auch ausgeblendet werden, oder?~~ ✅

23. die Seite http://localhost:3001/disciplines und der Dialog (Edit Discipline) 
a) ~~sind nich lokalisiert~~ ✅
b) ~~der Dialog "Edit Discipline" lässt sich nicht speichern~~ ✅

24. auf der seite http://localhost:3001/configuration sind in den Anwendungseinstellungen ist der ClientPort angegeben. Dieser passt aber nicht ganz, ich denke das ist nicht der production sondern der develop 

25. mit aktiver Check-Box Jury results 
a) die Berechnungsanzeige z.B. "D/A-Note • E/B-Note • Ausgangswert • Endwert" sollte die exakte formel anzeigen 
b) auch sollte dabei stehen was wie wann berechnet wird. 
c) Das Feld "Endwert (Jury)" und der Button "Calculate" sollte eingeblendet sein (wenn checkbox nicht angehakt dann ausgeblendet)

26. Das Beschreibungsfeld beim editieren von Layouts kann nicht geändert / beschrieben werden. http://localhost:3001/certificate-layouts