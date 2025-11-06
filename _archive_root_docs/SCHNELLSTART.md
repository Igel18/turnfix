# 🎯 TurnFix - Schnellstart für Anwender

## ⚡ Einfachste Bedienung - Nur Doppelklick!

### **Schritt 1: TurnFix Manager starten**

📁 **Doppelklick auf:** `TurnFix-Manager.bat`

Das war's! Ein benutzerfreundliches Menü öffnet sich.

---

## 📋 Was das Menü kann:

```
╔════════════════════════════════════════════════════════════╗
║                    TurnFix Manager                         ║
║          Turnwettkampf Verwaltungssystem v2.0             ║
╚════════════════════════════════════════════════════════════╝

Status wird geprüft...

┌─────────────────────────────────────────────────────┐
│             TurnFix Server Status                   │
├─────────────────────────────────────────────────────┤
│ Haupt-Server:     ✓ LÄUFT                          │
│   Adresse:        http://localhost:3001            │
│   Laufzeit:       45.3 Minuten                     │
│   Speicher:       114.5 MB                         │
│   Neustarts:      2                                │
│                                                     │
│ Kampfrichter:     ✓ LÄUFT                          │
│   Adresse:        http://localhost:3002            │
│   Laufzeit:       45.2 Minuten                     │
│   Speicher:       53.8 MB                          │
│   Neustarts:      1                                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   Hauptmenü                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [1] ▶  TurnFix STARTEN                            │
│  [2] ■  TurnFix STOPPEN                            │
│  [3] ↻  TurnFix NEU STARTEN                        │
│                                                     │
│  [4] 📊 Status anzeigen                             │
│  [5] 📋 Live-Logs anzeigen                          │
│  [6] 💻 System-Monitor öffnen                       │
│                                                     │
│  [7] 🌐 Webseiten öffnen                            │
│  [8] 🔧 Erweiterte Optionen                         │
│                                                     │
│  [0] ✖  BEENDEN                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Typische Arbeitsabläufe

### **Wettkampftag - Vorbereitung**

1. **Doppelklick** auf `TurnFix-Manager.bat`
2. **Drücke [1]** - "TurnFix STARTEN"
3. Warte 10-15 Sekunden
4. **Drücke [7]** - "Webseiten öffnen"
5. ✓ TurnFix läuft!

### **Während des Wettkampfs**

- **Status prüfen**: Drücke [4]
- **Probleme?** Drücke [3] für Neustart
- **Logs ansehen**: Drücke [5]

### **Nach dem Wettkampf**

1. **Doppelklick** auf `TurnFix-Manager.bat`
2. **Drücke [2]** - "TurnFix STOPPEN"
3. Fertig!

---

## 🌐 Zugriff von anderen Geräten (Tablets/Handys)

### **So finden Sie die Netzwerk-Adresse:**

1. **Doppelklick** auf `TurnFix-Manager.bat`
2. **Drücke [8]** - "Erweiterte Optionen"
3. **Drücke [4]** - "Netzwerk-IP anzeigen"

Beispiel-Ausgabe:
```
Netzwerk-Informationen:
  Ihre IP-Adresse: 192.168.1.105

  Zugriff vom Tablet/Handy:
    Verwaltung:    http://192.168.1.105:3001
    Kampfrichter:  http://192.168.1.105:3002
```

### **Auf dem Tablet/Handy:**

📱 Öffne Browser und gebe ein: `http://192.168.1.105:3002`
(Ersetze die IP mit deiner eigenen!)

---

## 🔧 Erweiterte Optionen

Im Menü **[8] Erweiterte Optionen** findest du:

| Option | Beschreibung | Wann nutzen? |
|--------|--------------|--------------|
| **[1] Logs löschen** | Entfernt alte Log-Dateien | Wenn Festplatte voll wird |
| **[2] PM2 neu starten** | Komplett-Neustart | Bei schweren Problemen |
| **[3] Build neu erstellen** | Software neu kompilieren | Nach Updates |
| **[4] Netzwerk-IP** | Zeigt deine IP-Adresse | Für Tablet-Zugriff |
| **[5] Datenbank prüfen** | Testet DB-Verbindung | Bei Verbindungsproblemen |

---

## ❓ Häufige Probleme & Lösungen

### **Problem: "Keine Server gestartet"**
✅ **Lösung**: Drücke [1] zum Starten

### **Problem: "Build-Dateien nicht gefunden"**
✅ **Lösung**: 
1. Drücke [8] (Erweiterte Optionen)
2. Drücke [3] (Build neu erstellen)
3. Drücke [0] (Zurück)
4. Drücke [1] (Starten)

### **Problem: "Webseite lädt nicht"**
✅ **Lösung**: 
1. Drücke [4] - Status prüfen
2. Wenn gestoppt: Drücke [1] zum Starten
3. Wenn läuft: Drücke [3] zum Neustart

### **Problem: "Tablet kann nicht verbinden"**
✅ **Lösung**:
1. Drücke [8] → [4] für Netzwerk-IP
2. Prüfe ob Tablet im gleichen WLAN ist
3. Windows Firewall prüfen:
   - Windows-Taste → "Firewall"
   - "App durch Firewall zulassen"
   - "Node.js" muss erlaubt sein

### **Problem: "Server startet nicht"**
✅ **Lösung**:
1. Drücke [8] → [5] (Datenbank prüfen)
2. Prüfe ob PostgreSQL läuft:
   - Windows-Taste → "Dienste"
   - Suche "PostgreSQL"
   - Muss "Wird ausgeführt" sein
3. Falls nicht: Rechtsklick → "Starten"

---

## 📊 Was bedeuten die Anzeigen?

### **Server Status**

```
✓ LÄUFT    = Server funktioniert normal
✗ GESTOPPT = Server ist aus (mit [1] starten)
```

### **Laufzeit**
- Zeigt wie lange der Server schon läuft
- Bei Neustart geht auf 0 zurück

### **Speicher**
- Zeigt RAM-Nutzung in MB
- Normal: 50-150 MB
- Bei >400 MB: Automatischer Neustart

### **Neustarts**
- Zählt wie oft Server neu gestartet wurde
- 0-5 = Normal
- >10 = Eventuell Problem (Logs prüfen mit [5])

---

## 🎓 Tipps für Anfänger

1. **Vor dem Wettkampf**: 
   - Starte TurnFix 30 Min vorher
   - Teste alle Tablets/Geräte
   - Mache Backup der Datenbank

2. **Während des Wettkampfs**:
   - Lass TurnFix-Manager geöffnet
   - Prüfe Status alle 30 Min mit [4]
   - Nicht während laufender Eingaben neu starten!

3. **Nach dem Wettkampf**:
   - Exportiere Ergebnisse zuerst
   - Dann mit [2] stoppen
   - Backup nicht vergessen!

---

## 📞 Weitere Hilfe

- 📖 **Vollständige Doku**: `README.md`
- 🚀 **Setup-Guide**: `setup/windows/SETUP-GUIDE-DE.md`
- 🔧 **Deployment**: `newWebBased/DEPLOYMENT.md`
- 🐛 **Probleme melden**: [GitHub Issues](https://github.com/Igel18/turnfix/issues)

---

## ⌨️ Tastenkürzel im Manager

| Taste | Funktion |
|-------|----------|
| **1** | Starten |
| **2** | Stoppen |
| **3** | Neustart |
| **7** | Browser öffnen |
| **0** | Beenden |

Einfach Zahl drücken + Enter!

---

**✨ Viel Erfolg mit TurnFix! ✨**

*Bei Fragen: Drücke im Menü [5] für Live-Logs oder [6] für System-Monitor*
