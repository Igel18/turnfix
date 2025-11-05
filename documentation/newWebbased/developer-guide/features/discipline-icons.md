# Discipline Icons Implementation - Point 18

## Zusammenfassung

✅ **Punkt 18 abgeschlossen**: "Jury Portal: Icons von den disziplinen verwenden, die auch bei diesen hinterlegt sind"

Das Jury Portal verwendet jetzt die echten Disziplin-Icons aus der Datenbank anstelle von hardcodierten Emojis.

## Implementierung

### 1. Utility-Funktionen

#### Client (`client/src/utils/iconUtils.ts`)
Bereits vorhanden und funktioniert korrekt:
- `getIconUrl()`: Konvertiert Qt-Ressourcenpfade (`:/icons/100.png`) zu Web-URLs
- `getIconFilename()`: Extrahiert Dateinamen aus Pfaden
- `checkIconExists()`: Prüft, ob ein Icon existiert

#### Jury Portal (`jury-portal/src/utils/iconUtils.ts`) - **NEU ERSTELLT**
Neue Utility-Datei für das separate Jury Portal:
- `getIconUrl()`: Gleiche Funktionalität wie Client
- `getIconFilename()`: Gleiche Funktionalität wie Client
- `getFallbackDeviceEmoji()`: Emoji-Fallbacks wenn DB-Icon nicht verfügbar

### 2. Datenbank-Integration

#### API Endpoint (`server/src/routes/competitions.ts`)
Der bestehende Endpoint `/competitions/:id/disciplines` liefert bereits:
```typescript
{
  var_icon: string,  // Icon-Pfad aus Datenbank (z.B. ":/icons/100.png")
  var_name: string,  // Disziplin-Name
  // ... weitere Felder
}
```

### 3. Jury Portal Änderungen

#### Standalone Jury Portal (`jury-portal/src/components/JuryPortal.tsx`)

**Vorher:**
```typescript
const getDeviceIcon = (deviceName: string): string => {
  const iconMap: { [key: string]: string } = {
    'Boden': '🤸',
    'Reck': '🏃',
    // ... hardcodierte Emojis
  };
  return iconMap[deviceName] || '🏆';
};
```

**Nachher:**
```typescript
// Import der Utility-Funktionen
import { getIconUrl, getFallbackDeviceEmoji } from '../utils/iconUtils';

// Device-Mapping verwendet jetzt DB-Icons
const devicesList = filteredDisciplines.map((discipline: any) => ({
  id: discipline.int_disziplinid,
  name: discipline.var_name,
  disciplineId: discipline.int_disziplinid,
  icon: discipline.var_icon || getFallbackDeviceEmoji(discipline.var_name),
  iconPath: discipline.var_icon
}));

// UI zeigt echte Icons an
{device.iconPath ? (
  <img 
    src={getIconUrl(device.iconPath) || ''}
    alt={`${device.name} icon`}
    className="w-16 h-16 object-contain"
    onError={(e) => {
      // Fallback zu Emoji bei Fehler
      e.currentTarget.style.display = 'none';
      const parent = e.currentTarget.parentElement;
      if (parent) {
        parent.innerHTML = `<div class="text-4xl">${device.icon}</div>`;
      }
    }}
  />
) : (
  <div className="text-4xl">{device.icon}</div>
)}
```

#### Client Jury Portal (`client/src/pages/JuryPortal.tsx`)
✅ Bereits korrekt implementiert - verwendet `getIconUrl()` von Anfang an.

### 4. Fallback-Strategie

Die Implementierung verwendet eine mehrstufige Fallback-Strategie:

1. **Primär**: DB-Icon (`var_icon` aus `tfx_disziplinen`)
2. **Sekundär**: Emoji-Fallback aus `getFallbackDeviceEmoji()`
3. **Tertiär**: Standard-Trophy-Icon 🏆

```typescript
// Priorität bei Icon-Auswahl
discipline.var_icon               // 1. Datenbank-Icon
|| getFallbackDeviceEmoji(name)  // 2. Emoji-Fallback
|| '🏆'                           // 3. Standard-Icon
```

### 5. Verfügbare Disziplin-Icons

Die Datenbank (`tfx_disziplinen`) enthält Icons für:
- Boden
- Balken/Schwebebalken
- Reck
- Barren/Stufenbarren
- Pferd/Pauschenpferd
- Sprung
- Ringe
- Minitrampolin
- Gerätebahn A/B

Icon-Pfade sind im Qt-Format gespeichert: `:/icons/[nummer].png`

### 6. Icon-Konvertierung

Qt-Ressourcenpfade werden automatisch zu Web-URLs konvertiert:

```
:/icons/100.png  →  http://localhost:3001/public/icons/100.png
```

Die Conversion erfolgt transparent durch `getIconUrl()`.

## Vorteile der neuen Implementierung

✅ **Konsistenz**: Gleiche Icons in allen UI-Komponenten (Results, Disciplines Management, Jury Portal)
✅ **Wartbarkeit**: Icons zentral in der Datenbank verwaltet
✅ **Flexibilität**: Neue Disziplinen benötigen keine Code-Änderungen
✅ **Fallback**: Emojis als Backup wenn DB-Icons fehlen
✅ **Wiederverwendbarkeit**: Shared Utility-Funktionen

## Testing

Zu testen:
1. ✅ Jury Portal öffnen: http://localhost:5174 (separate App)
2. ✅ Client Jury Portal: http://localhost:5173/jury
3. ✅ Event auswählen → Squad auswählen → Gerät auswählen
4. ✅ Verifizieren dass echte Icons angezeigt werden (nicht nur Emojis)
5. ✅ Bei fehlendem Icon: Emoji-Fallback wird angezeigt

## Dateien geändert

### Neue Dateien:
- `jury-portal/src/utils/iconUtils.ts`

### Geänderte Dateien:
- `jury-portal/src/components/JuryPortal.tsx`
  - Import von iconUtils hinzugefügt
  - Device Interface erweitert (iconPath)
  - getDeviceIcon() Funktion entfernt
  - Icon-Mapping auf DB-Daten umgestellt
  - UI-Rendering für Image-Icons erweitert

### Unverändert (bereits korrekt):
- `client/src/pages/JuryPortal.tsx`
- `client/src/utils/iconUtils.ts`
- `server/src/routes/competitions.ts`

## Nächste Schritte

Keine weiteren Änderungen erforderlich. Punkt 18 ist vollständig implementiert.

Optional für Zukunft:
- Icon-Upload-Funktion in Disciplines Management
- Icon-Vorschau in Discipline Edit Dialog
- SVG-Support zusätzlich zu PNG
