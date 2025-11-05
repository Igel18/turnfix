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
| **System-Anforderungen** | [Requirements](requirements.md) |
| **Netzwerk-Setup** | [Network Setup](network-setup.md) |

## 📝 Typische Workflows

### Als Wettkampf-Veranstalter

1. **Veranstaltung anlegen** → [Event Management](../user-guide/event-management/create-event.md)
2. **Teilnehmer importieren** → [GymNet Import](../user-guide/workflows/gymnet-import.md)
3. **Riegen zuordnen** → [Squad Management](../user-guide/event-management/squads.md)
4. **Zeitplan erstellen** → [Time Planning](../user-guide/time-planning/sessions.md)
5. **Wettkampf durchführen** → [Live Scoring](../user-guide/score-capture/overview.md)
6. **Ergebnisse & Urkunden** → [Results & Export](../user-guide/results/certificates.md)

### Als Kampfrichter

1. **Jury-Portal öffnen** → [Jury Portal Guide](../user-guide/score-capture/jury-portal.md)
2. **Wettkampf auswählen**
3. **Wertungen eingeben**
4. **Live-Synchronisation** beobachten

### Als System-Administrator

1. **Server installieren** → [Production Deployment](../deployment/production.md)
2. **Netzwerk konfigurieren** → [Network Setup](network-setup.md)
3. **PM2 einrichten** → [PM2 Guide](../deployment/pm2.md)
4. **Monitoring aktivieren** → [Monitoring](../deployment/monitoring.md)

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
| "Server nicht erreichbar" | Firewall-Einstellungen prüfen → [Troubleshooting](../deployment/troubleshooting.md) |
| "Wertungen werden nicht gespeichert" | Browser-Cache leeren, neu laden |
| "Gantt-Chart zeigt nicht alle Riegen" | Startgeräte festlegen → [Start Devices](../user-guide/time-planning/start-devices.md) |

## 📞 Support

- 📖 **Dokumentation**: Diese GitBook-Seiten
- 💬 **Community**: [GitHub Discussions](https://github.com/Igel18/turnfix/discussions)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Igel18/turnfix/issues)

## 🔄 Von Qt-Version migrieren?

Wenn Sie von der alten Desktop-Version kommen:

→ [Migrationsguide](../appendix/migration-guide.md)

## ⏭️ Nächste Schritte

Je nach Ihrer Rolle:

- **Neu hier?** → [Installation](installation.md)
- **Erfahrener Nutzer?** → [Benutzerhandbuch](../user-guide/README.md)
- **Entwickler?** → [Developer Guide](../developer-guide/README.md)
- **Admin?** → [Deployment Guide](../deployment/production.md)

---

**Viel Erfolg mit TurnFix v2.0! 🎉**
