# TurnFix

TurnFix is a program to manage gymnastics competition data. It was build mainly for competitions held in Germany and is currently available in German only.

## Build

Builds with Qt5.13 and MinGW on Windows. To Build it successful https://github.com/abhijitkundu/QtPropertyBrowser.git must be cloned to libs. 

## Execute 

To execute the program some additional files are necesarry and must be copied to execution folder. 
From Qt\5.13.0\mingw73_64\bin folder: 
- libgcc_s_seh-1.dll 
- libstdc++-6.dll 
- libwinpthread-1.dll 
- Qt5Cored.dll
- Qt5Guid.dll
- QtNetworkd.dll 
- QtPrintSupportd.dll
- QtSqld.dll
- QtWidgetsd.dll 

From PostGreSQL 11 folder: 
- libeay32.dll
- libpq.dll
- ssleay32.dll
- libiconv-2.dll 
- libintl-9.dll


## License

Apache 2.0
## Setup 
### Database 
#### Install PostgreSQL 11.8 

![grafik](https://user-images.githubusercontent.com/10853055/215724143-29a8dcc4-1906-4d95-96cc-10a054eaef16.png)
![grafik](https://user-images.githubusercontent.com/10853055/215724198-f7c1f09d-80bd-4965-90d4-8f315b91d83a.png)
![grafik](https://user-images.githubusercontent.com/10853055/215724226-40e62bb0-354d-4d6c-a5bc-32c81c6c6cb5.png)
![grafik](https://user-images.githubusercontent.com/10853055/215724239-1d327810-0738-4a72-abea-f951a0b82a1c.png)

Set SuperUser Password for PostgreSQL database and keep it: 
![grafik](https://user-images.githubusercontent.com/10853055/215724320-8a893389-5a52-40cc-9704-f9d58057ae92.png)
![grafik](https://user-images.githubusercontent.com/10853055/215724398-9234c178-361a-453e-a14f-d94dbd6279e8.png)

Set locale to Germany: 

![grafik](https://user-images.githubusercontent.com/10853055/215724415-69993895-12be-4b12-af2f-c15f007c2d0f.png)

Dont lunch stack Builder: 

![grafik](https://user-images.githubusercontent.com/10853055/215724544-c364aebb-a936-4e96-973e-873d3cd674f7.png)

### TurnFix 1.4

Extracct turnfix_1[1].1.4.zip 
Copy the Folder to C:\Program Files (x86)\turnfix_1[1].1.4
Execute TurnFix.exe 

#### Database properties 
Setup Database properties to 
- PostgreSQL
- Server: localhost 
- Benutzername: turnfixadmin 
- Password:  
![grafik](https://user-images.githubusercontent.com/10853055/215725015-399957f6-967c-447b-bda0-b80cb5b44b07.png)

#### Setup Turnfix Database
Change to login 
Select "anmelden" 
Dialog appears "Datenbankfehler" 
Select "Ja" 
![grafik](https://user-images.githubusercontent.com/10853055/215725566-85827ff2-3da7-4226-a5fa-13c6a2065eaf.png)

#### Database setup wizard 
![grafik](https://user-images.githubusercontent.com/10853055/215726014-8f6417ab-33d4-4d04-845d-ecd598967931.png)

In PostgreSQL-Admin Daten select 
- Username:  "postgres" 
- Password: select the individual password for PostgreSQL SuperUser. 
![grafik](https://user-images.githubusercontent.com/10853055/215726137-401db227-f4df-428d-bd09-b9ae8761ca8e.png)

Select a User and Password for the TurnFix Database: 
![grafik](https://user-images.githubusercontent.com/10853055/215726920-0b000fe3-c664-46e5-8aa3-af4a51cc68a9.png)

Select a Database name e.g. "turnfix", "turnfixtest", "turnfixproductiv" 
![grafik](https://user-images.githubusercontent.com/10853055/215726953-4d413bc2-2408-4b28-a08b-1f02ddc063bc.png)

After that step the Database should be setup sucessful: 
![grafik](https://user-images.githubusercontent.com/10853055/215727276-18e46974-680b-4bc6-937b-b3f18d866607.png)
![grafik](https://user-images.githubusercontent.com/10853055/215727226-322973b4-a3dd-4d54-b53c-c11a63432c32.png)

### change login properties 
Change Username, Password and Database like setup in previous steps: 
![grafik](https://user-images.githubusercontent.com/10853055/215727414-599fb25d-9bc8-4050-a4d2-1542d8d6c662.png)

### TurnFix 2.x
now TurnFix 2.x can be used with the same login credentials 

## Views
### Login
![grafik](https://user-images.githubusercontent.com/10853055/195056135-b37b39f1-0ec8-4c2f-b764-b86d518840be.png)

## Competitions 
![grafik](https://user-images.githubusercontent.com/10853055/195056483-be2e660d-8cee-4215-8b08-3cafdb244338.png)

## Participants 
![grafik](https://user-images.githubusercontent.com/10853055/195056751-1c90ed4d-54d0-46c9-9170-6dbbd34f8505.png)

## Squads 
![grafik](https://user-images.githubusercontent.com/10853055/195056873-bf7f6fe0-a7a5-4d1e-b0b5-f3b4ed169d7e.png)

## Score input
![grafik](https://user-images.githubusercontent.com/10853055/195057090-ab40614e-71b9-4563-aae8-5f570e0f4e7b.png)

## Result 
![grafik](https://user-images.githubusercontent.com/10853055/195057281-1fd59940-015e-4a4a-b92a-4dc8d95426d8.png)

## Print & Export 
![grafik](https://user-images.githubusercontent.com/10853055/195057438-377051c8-9ae1-4246-bdc6-0ae86b5e5f98.png)

## Squad states 
![grafik](https://user-images.githubusercontent.com/10853055/195057667-0da15239-9bbb-4e62-9f75-61b42a5b84e0.png)

## Database administration 
![grafik](https://user-images.githubusercontent.com/10853055/195057951-fa90ceb8-3125-437a-b4d1-2bb2b99bf4b4.png)
