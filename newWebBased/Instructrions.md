1. in veranstaltungsverwaltung muss es einen button geben um die Startnummern zu generieren
2. ~~in der Ansicht "Event Participants" ist nich lokalisiert~~ ✅
3. ~~in der Ansicht "Event Participants" funktioniert der Filter mit den AgeGroups nicht. ich denke es ist ausreichend nach Age zu filtern.~~ ✅
4. ~~die Ansicht "Manage Squads" ist nicht lokalisiert~~ ✅
5. ~~in der Ansicht "Manage Squads" benötige ich eine neue FUnktion: Bei Auswahl eines Wettkampfes in den Riegen Details (rechte Spalte) "assigned Competitions" sollen alle Teilnehmer von diesem Wettkampf gehighlightet werden.~~ ✅
6. ~~in der Ansicht "Manage Squads" kann man aktuell nicht nach Vereinen Filtern.~~ ✅
7. ~~Lokalisierung der aller UIs im Veranstaltungsverwaltung die noch nicht lokalisiert sind.~~ ✅
8. In der View http://localhost:5173/certificate-layouts beim Editieren eines Layouts sind die DB Felder durch nummeriert. Es ist nicht klar was dahinter steckt... lässt sich irgendwie raus finden was die Felder bedeuten? Im Alten c++ code waren die felder genau benannt. 
9. Auf der Seite Veranstaltungsteilnehmer gibt es einen Export "Teilnehmer Etiketten" diese Etiketten müssen sortiert werden nach Gender dann Riege dann Verein. 
10. Gender in den Participant listen ist oft unknown. Bei den Veranstaltungsteilnehmern passt es aber. 
11. Setup so gestalten, dass mit einem klick alles installiert wird, so wie ich das sehe ist das u.a. 
    - postgres (runterladen und installieren)
    - node
    - npm 
    - turnfix  
    - alle dependencies 
12. Wird die Seite "event-management" bearbeitet und soll dann gespeichert werden, kann man den speicher button nicht finden, da dieser ganz weiß ist. 


refactoring (nur noch prisma) 
Über Turnfix 
DB cleanup: complete oder nur Personen und Vereine

The export as pdf is possible on some UIs. We need some more print export as pdf posibilities. So perhaps we should add a new UI in section event management for print / export as pdf. We need: 
- Urkunden generierung / generate cerificates for a selected person or a selected competition
- Wettkampfbögen / competition sheets for a selected squad 
- Zeitplan/Timetable it must be possible to print a timetable 
Alterntive: 
- We add a separat UI for each print posibility...? 



 

 

Setup 

Register neue User

User Management with Admin Rights

Löschen von Einträgen in den Manage views

TypeScript compilation wegen camel case in DB

Einstellungen

SQL Server

User


 


