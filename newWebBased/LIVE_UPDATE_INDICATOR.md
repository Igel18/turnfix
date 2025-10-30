# Live-Update UI-Element - Dokumentation

## Übersicht

Das `LiveUpdateIndicator` Component ist ein wiederverwendbares UI-Element, das anzeigt, wenn eine Seite oder Komponente aktive Live-Updates über Socket.IO hat. Es zeigt einen grünen pulsierenden Punkt mit optionalem Label.

## Implementierte Seiten mit Live-Updates

### 1. **LiveScoreUpdates** (Score-Wertungen)
- **Datei**: `client/src/components/LiveScoreUpdates.tsx`
- **Verwendung**: Zeigt Live-Wertungen in Echtzeit
- **Socket Events**: 
  - `score-updated` - Neue Wertung eingegangen
  - `join-competition` / `leave-competition` - Raum betreten/verlassen
- **Live-Indikator**: Bereits integriert (Zeile 123)

### 2. **CompetitionStatusManagement** (Wettkampf-Status)
- **Datei**: `client/src/pages/CompetitionStatusManagement.tsx`
- **Verwendung**: Echtzeit-Updates für Wettkampfstatus
- **Socket Events**:
  - `competition-status-updated` - Wettkampfstatus geändert
  - `squad-status-updated` - Riegen-Status geändert
- **Live-Indikator**: ⚠️ Noch nicht sichtbar implementiert

## LiveUpdateIndicator Component

### Import
```tsx
import LiveUpdateIndicator from '@/components/LiveUpdateIndicator'
```

### Basis-Verwendung

#### Einfachster Fall (nur grüner Punkt + "Live")
```tsx
<LiveUpdateIndicator />
```

#### Mit eigenem Label
```tsx
<LiveUpdateIndicator label="Live Scores" />
```

#### Verschiedene Größen
```tsx
{/* Klein */}
<LiveUpdateIndicator size="sm" />

{/* Mittel (Standard) */}
<LiveUpdateIndicator size="md" />

{/* Groß */}
<LiveUpdateIndicator size="lg" />
```

#### Deaktivierter Status (grau, kein Puls)
```tsx
<LiveUpdateIndicator isActive={false} />
```

#### Nur Punkt, kein Label
```tsx
<LiveUpdateIndicator showLabel={false} />
```

### Props

| Prop | Typ | Standard | Beschreibung |
|------|-----|----------|--------------|
| `isActive` | `boolean` | `true` | Ob Live-Updates aktiv sind (grün + Puls) oder nicht (grau) |
| `label` | `string` | - | Benutzerdefiniertes Label (überschreibt Standard "Live") |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Größe des Indikators |
| `className` | `string` | `''` | Zusätzliche CSS-Klassen |
| `showLabel` | `boolean` | `true` | Ob "Live" Label angezeigt werden soll |

### Beispiel-Implementierungen

#### In einem Header
```tsx
<div className="flex items-center justify-between">
  <h1>Wettkampfergebnisse</h1>
  <LiveUpdateIndicator />
</div>
```

#### Mit Socket.IO State
```tsx
const [isConnected, setIsConnected] = useState(false)

useEffect(() => {
  const socket = getSocket()
  
  socket.on('connect', () => setIsConnected(true))
  socket.on('disconnect', () => setIsConnected(false))
  
  return () => {
    socket.off('connect')
    socket.off('disconnect')
  }
}, [])

return (
  <div>
    <LiveUpdateIndicator 
      isActive={isConnected} 
      label={isConnected ? "Live Updates" : "Offline"}
    />
  </div>
)
```

#### In EventManagementTemplate Header
```tsx
<EventManagementTemplate
  title="Score Capture"
  customActions={
    <LiveUpdateIndicator label="Live Scores" />
  }
>
  {/* Content */}
</EventManagementTemplate>
```

## Wo sollte der Indikator hinzugefügt werden?

### Empfohlene Seiten für Live-Update Indikator:

1. **✅ LiveScoreUpdates** - Bereits implementiert
2. **⚠️ CompetitionStatusManagement** - Socket.IO aktiv, aber kein visueller Indikator
3. **⚠️ SquadStatusManagement** - Könnte von Live-Updates profitieren
4. **⚠️ ScoreCapture** - Wenn andere Jury-Mitglieder Wertungen eingeben
5. **⚠️ Results** - Echtzeit-Aktualisierung wenn neue Ergebnisse berechnet werden

### Implementierungs-Beispiel für CompetitionStatusManagement

**Vorher:**
```tsx
<EventManagementTemplate
  title={t('competitionStatus.title')}
  subtitle={t('competitionStatus.subtitle')}
  icon={TrophyIcon}
>
```

**Nachher:**
```tsx
<EventManagementTemplate
  title={t('competitionStatus.title')}
  subtitle={t('competitionStatus.subtitle')}
  icon={TrophyIcon}
  customActions={
    <LiveUpdateIndicator 
      label={t('common.liveUpdates')} 
    />
  }
>
```

## Lokalisierung

Füge folgende Keys zu `de.json` und `en.json` hinzu:

**de.json:**
```json
{
  "common": {
    "live": "Live",
    "liveUpdates": "Live-Updates"
  }
}
```

**en.json:**
```json
{
  "common": {
    "live": "Live",
    "liveUpdates": "Live Updates"
  }
}
```

## Styling-Details

### Farben
- **Aktiv**: `bg-green-400` (grün, pulsierend)
- **Inaktiv**: `bg-gray-400` (grau, statisch)

### Größen
- **Small**: 1.5 x 1.5 (6px), Text: text-xs
- **Medium**: 2 x 2 (8px), Text: text-sm
- **Large**: 3 x 3 (12px), Text: text-base

### Animation
- Tailwind CSS: `animate-pulse` (nur wenn `isActive={true}`)

## Best Practices

1. **Platzierung**: Rechts oben im Header oder neben dem Titel
2. **Größe**: Verwende `size="md"` für Header, `size="sm"` für Inline-Text
3. **State Management**: Verbinde `isActive` mit tatsächlichem Socket-Verbindungsstatus
4. **Accessibility**: Label macht Status für Screen-Reader verfügbar
5. **Konsistenz**: Verwende gleiche Props auf ähnlichen Seiten

## Testing

```tsx
import { render, screen } from '@testing-library/react'
import LiveUpdateIndicator from '@/components/LiveUpdateIndicator'

test('shows green pulsing dot when active', () => {
  render(<LiveUpdateIndicator />)
  const indicator = screen.getByText('Live')
  expect(indicator).toBeInTheDocument()
})

test('shows gray static dot when inactive', () => {
  render(<LiveUpdateIndicator isActive={false} />)
  // Check for gray color class
})
```

## Nächste Schritte

1. ✅ Component erstellt: `LiveUpdateIndicator.tsx`
2. ✅ Dokumentation erstellt: `LIVE_UPDATE_INDICATOR.md`
3. ⏳ Lokalisierung hinzufügen (de.json, en.json)
4. ⏳ In CompetitionStatusManagement integrieren
5. ⏳ Weitere Seiten mit Socket.IO erweitern
6. ⏳ Tests schreiben

## Verwandte Dateien

- `client/src/components/LiveUpdateIndicator.tsx` - Component
- `client/src/components/LiveScoreUpdates.tsx` - Verwendungsbeispiel
- `client/src/pages/CompetitionStatusManagement.tsx` - Socket.IO Integration
- `client/src/utils/socket.ts` - Socket.IO Utility
- `newWebBased/LIVE_UPDATE_INDICATOR.md` - Diese Dokumentation
