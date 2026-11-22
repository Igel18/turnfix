# Erste Schritte mit TurnFix v2.0

Willkommen bei TurnFix v2.0! Diese Anleitung hilft Ihnen beim Einstieg in die webbasierte Wettkampfverwaltung.

## 📋 Übersicht

TurnFix v2.0 ist eine moderne Webanwendung zur Verwaltung von Turnwettkämpfen. Sie ersetzt die Desktop-Version und bietet:

- 🌐 **Browserbasiert** - Kein Software-Download nötig
- 📱 **Multi-Device** - PC, Tablet, Smartphone
- 👥 **Multi-User** - Mehrere Personen gleichzeitig
- 🔄 **Live-Updates** - Echtzeit-Synchronisation
- 🌍 **Mehrsprachig** - Deutsch & Englisch

## 🚀 Quick Links

| Für... | Start hier |
|--------|-----------|
| **Erste Installation** | [Installation Guide](installation.md) |
| **Schneller Einstieg** | [Quickstart](quickstart.md) |
| **System-Anforderungen** | [Installation und Voraussetzungen](installation.md) |
| **Netzwerk-Setup** | [Netzwerk-Konfiguration](../deployment/network.md) |

## 📝 Typische Workflows

### Als Wettkampf-Veranstalter

1. **Stammdaten und Veranstaltung vorbereiten** → [Grundlagen](../user-guide/stammdaten-und-veranstaltung.md)
2. **Wettkämpfe konfigurieren** → [Wettkampfverwaltung](../user-guide/event-competition-management.md)
3. **Teilnehmer verwalten** → [Teilnehmerverwaltung](../user-guide/participant-management.md)
4. **Zeitplan erstellen** → [Zeitplanung](../user-guide/time-planning.md)
5. **Wettkampf durchführen** → [Wertungserfassung](../user-guide/score-capture.md)
6. **Urkunden vorbereiten** → [Urkunden erstellen](../user-guide/certificate-creation.md)

### Als Kampfrichter

1. **Jury-Portal öffnen** → [Wertungserfassung und Kampfrichter-Portal](../user-guide/score-capture.md)
2. **Wettkampf auswählen**
3. **Wertungen eingeben**
4. **Live-Synchronisation** beobachten

### Als System-Administrator

1. **Server installieren** → [Production Deployment](../deployment/production.md)
2. **Netzwerk konfigurieren** → [Netzwerk-Konfiguration](../deployment/network.md)
3. **Produktivbetrieb einrichten** → [Deployment](../deployment/production.md)

## 🎯 Kernfunktionen

### Veranstaltungsverwaltung
- ✅ Events anlegen und verwalten
- ✅ Wettkämpfe konfigurieren
- ✅ Teilnehmer importieren/verwalten
- ✅ Startnummern generieren
- ✅ Riegen zusammenstellen

### Zeitplanung
- ✅ Durchgänge planen
- ✅ Gantt-Chart Visualisierung
- ✅ Rotations-Planung
- ✅ Startgeräte festlegen

### Wertungserfassung
- ✅ Live-Scoring
- ✅ Kampfrichter-Portal
- ✅ Automatische Berechnungen
- ✅ Echtzeit-Updates

### Ergebnisse & Export
- ✅ Wettkampfstatus-Übersicht
- ✅ Urkunden drucken
- ✅ PDF-Export
- ✅ CSV-Export

## 💡 Hilfreiche Tipps

### Browser-Kompatibilität

✅ **Empfohlen**:
- Google Chrome 90+
- Microsoft Edge 90+
- Firefox 88+

⚠️ **Eingeschränkt**:
- Safari (iOS-Geräte)
- Internet Explorer (nicht unterstützt!)

### Performance-Tipps

- **Große Events** (>200 Teilnehmer): Chrome verwenden
- **Mehrere Tabs**: Nur einen aktiven Score-Capture Tab
- **Netzwerk**: LAN bevorzugen (WLAN als Fallback)

### Häufige Probleme

| Problem | Lösung |
|---------|--------|
| "Server nicht erreichbar" | Firewall-Einstellungen prüfen → [Firewall-Konfiguration](../deployment/firewall-platform.md) |
| "Wertungen werden nicht gespeichert" | Browser-Cache leeren, neu laden |
| "Gantt-Chart zeigt nicht alle Riegen" | Startgeräte und Riegen in der [Zeitplanung](../user-guide/time-planning.md) prüfen |

## 📞 Support

- 📖 **Dokumentation**: Diese GitBook-Seiten
- 💬 **Community**: [GitHub Discussions](https://github.com/Igel18/turnfix/discussions)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Igel18/turnfix/issues)

## 🔄 Von Qt-Version migrieren?

Wenn Sie von der alten Desktop-Version kommen:

→ Die Desktop- und Web-Dokumentation unterscheiden sich; siehe [Dokumentationsübersicht](../SUMMARY.md).

## ⏭️ Nächste Schritte

Je nach Ihrer Rolle:

- **Neu hier?** → [Installation](installation.md)
- **Erfahrener Nutzer?** → [Benutzerhandbuch](../SUMMARY.md)
- **Entwickler?** → [Developer Guide](../developer-guide/README.md)
- **Admin?** → [Deployment Guide](../deployment/production.md)

---

**Viel Erfolg mit TurnFix v2.0! 🎉**
