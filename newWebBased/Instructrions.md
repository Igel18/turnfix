

Add a view with all backend code to manage the available Events.

Add a view to create a club with all backend code.

Add a opportiunity to add participants manually.

 

Change the "Create new event" view like the "Manage Clubs" View so first have a list of all events and then have a possibility to add a new one.

Add a opportiunity to select a event and therefore all the participants of the event and scores and so on.

---

Add a View and backend code to manage Squads for the selected event

---

Groupe the UI menu: first manage and add all athletes clubs and so on in the database. Second to manage all participants, score, competitions, results, for the selected event.

Home Button

---

update the "Add New Competition" dialog tho add all possible options from the database

---

 

the event ui is correct.

but in the competition management are not the correct entries. There must be entries like "gerätvierkampf m 14-15" with "weiblich" and "Geburtsdatum von" "Geburtsdatum bis" from the database

add a manage devices for competitions and a corresponding "add" function with all possible options from the database

---

 

Event Management: There is currently dummy data visible.

---

 

 

add Prisma routes which do not exist for every table in the database to add, change and delete table entries . So that is not longer necessary to reference to tables in the Database.

 

 

Prisma-based implementation.

I think the server/src/routes were replaced by the server/dist/routes. is this correct?

 

there are a lot of js files in the folder server/dist/routes. Is it necessary to add corresponding routes in the src/routes folder?

 

home button vs logout

---

possibility to select a event. the competitions and squads and other regarding data like scores must be selected for this event. Implement a UI for this selection and if not yet available the corresponding Prisma routes to access the database tables.

---

persist the event selection. so if a user select a event and then goes in a Menu unter this (like view competitions) and then goes back to the dashboard the previous selected event must be still be selected

 

there must be a new menu entry on the dashboard for the selected event for the participants of the event.

---

 

 

Event editing UI must be improved: There must be all fields from the database inside like the "Ansprechpartner, Meldeschluss, ". It is not possible to add a new event.

 

UI unification: In every Menu Entry the UI must be unified. There must be a small State Info like in "Event Management": "Upcoming" "Active" "Completed". There must be a opportunity to filter/search the entries like in "Discipline & Gymnastics Devices" and a "Clear All Filter" button.

In every of these ui's it must be possible to export the data as a csv.

---

All Entries in the UIs must be unified as well like in the diciplines: 2 different types for the Entries. One as usual List (Participant Management). And Second as Boxes (Event Management) where the Information about the entry is in the top seperated with a horizontal line and under the line posibilities to "View Details", "Edit" and "Remove" the entry.

---

on the dashboard there must be a new menu entry in the groupe "event management" for the squad (riegen). 

---

use port nr "PORT=" from .env file in all pages *.tsx files

---

in event management in the UI score-capture are two drop downs for selecting device and squad. The selection must be stored like in the dashboard the selected event

---

 

In menu entry "Event Management" under the button "Add Event" you has to add a new button to import a event from "DTB Gymnet" xml with the following shema. The add has to import all informations from the xml to the Database beginning from the event informations, the competitions and the information of them, the disciplines regarding the competitions, and the participants with the corresponding competition and all the information from the participants. If a participant already exist update it, if a club already exist update it, if a device already exist use it.

 

---

improve db settings

remove test server

---

you did changes in events.js and disziplines.js which seems to be not match to the database schema:

        int_disziplinenid as id,

        var_name as name,

        var_kurz1 as short_name,

        var_kurz2 as display_name,

        var_einheit as apparatus,

        bol_m as male_allowed,

        bol_w as female_allowed,

        CASE

          WHEN bol_m = true AND bol_w = true THEN 'gemischt'

          WHEN bol_m = true AND bol_w = false THEN 'männlich'

          WHEN bol_m = false AND bol_w = true THEN 'weiblich'

          ELSE 'unbekannt'

        END as gender_text,

        int_sportid as sport_id,

        var_icon as icon

and

        v.int_veranstaltungenid as int_eventid,

        v.var_name as var_eventname,

        v.dat_von as dat_eventstartdate,

        v.dat_bis as dat_eventenddate,

        v.var_veranstalter as var_location,

        '' as var_description,

        (SELECT COUNT(*) FROM tfx_wertungen wr

         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid

         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as participant_count,

        (SELECT COUNT(*) FROM tfx_wertungen wr

         JOIN tfx_wettkaempfe w ON wr.int_wettkaempfeid = w.int_wettkaempfeid

         WHERE w.int_veranstaltungenid = v.int_veranstaltungenid) as score_count

      FROM tfx_veranstaltungen v

 
---------------
 
UI: A new button next to the Home button to switch between table view and card view. 
---
 
Save the state of the last selected Layout 
---


Competition Management UI: a new posibility to set the max score of all selected devices to a same value
---


Club management view the table has a other look. it has no header and boarder. 

---
New view for location management in database groupe in dashboard 
New view for Personen management in database groupe in dashboard 
-- 
on the dashboard in group database management I need 3 new UIs. 
new view for sport arten -> tfx_sport
new view for formeln -> tfx_formeln
new view for Disziplingroups -> tfs_disziplinen_gruppen
every UI must have a table for the dataelements. It must be possible to add edit and delete elements
---


Riegen einteilen -> 3 Spaltig (Riegen, Starter zugewiesen, Starter nicht zugewiesen)

Konfig section 
- DB alle infos separat speicher auch passwort 
- debug 
- sprache 
 

lokalisierung 
refactoring (nur noch prisma) 
Geräte mit Icons 
Über Turnfix 

UI redisign: 
the activ events, registered clubs, total athletes belong to Database management. Perhaps this info could be at the buttons eg "Manage Athletes"? 
The UI is very full. usually the database management is not used either to create / import a new event. 
The most used function is the "event management" section. Do you have two ideas to redisgn the UI that this most used event management is more in scope? 
Perhaps with shortcut to crate/import a new event. 
On every side the Table and cards should have the same look and feel: Same delete button, same change button, same look button, ... 

The export as pdf is possible on some UIs. We need some more print export as pdf posibilities. So perhaps we should add a new UI in section event management for print / export as pdf. We need: 
- Urkunden generierung / generate cerificates for a selected person or a selected competition
- Wettkampfbögen / competition sheets for a selected squad 
- Medallienspiegel / medal results for the event: it shows how much medals each club has won in this event in sum and seperated by competition 
- Zeitplan/Timetable it must be possible to print a timetable 
Alterntive: 
- We add a separat UI for each print posibility...? 

On each paper (either the certificates) there must be a header and a footer. In the header on the Left there must be the name of the event, the Date and the location of the event. On the Right the name of the printing. in the footer must written the actual Date Time and license (GNU GPL v3.1) on the Right and the following: "created with TurnFix" and the URL github.com/Igel18/turnfix



in the UI: At each entry from an event must be a information like how much Participants are at this event, how much clubs are participating at this event.

in the UI: At each entry from a club must be the information how much

 

 

Setup

 

Import

 

Register neue User

User Management with Admin Rights

 

Status Seite für Wettkämpfe -> mit Fertig Meldung und plausibilitätscheck?

 

Löschen von Einträgen in den Manage views

 

TypeScript compilation wegen camel case in DB

 

Einstellungen

SQL Server

User

Sprache wie browser

 

Viele Grüße

Dominik

 

KUKA Deutschland GmbH   Board of Directors: Michael Jürgens (Chairman), Dirk Busch, Johan Naten, Hui Zhang   Registered Office: Augsburg HRB 14914

This e-mail may contain confidential and/or privileged information. If you are not the intended recipient (or have received this e-mail in error) please notify the sender immediately and destroy this e-mail. Any unauthorized copying, disclosure or distribution of contents of this e-mail is strictly forbidden.

Please consider the environment before printing this e-mail.

Internal
