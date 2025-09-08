# Jury Portal

A dedicated jury interface for TurnFix competitions that provides a simplified, competition-day focused experience for jury members.

## Features

- **Dedicated Port (5174)**: Runs independently from the main dashboard to avoid confusion
- **Real Database Integration**: Fetches actual events, squads, and participants from the TurnFix database
- **Mobile-Optimized**: Works well on tablets, phones, and desktop computers
- **Simplified Workflow**: Event → Squad → Device → Scoring
- **Competition Day Focus**: Only essential features for jury scoring

## Getting Started

### Prerequisites
- Node.js 18 or higher
- The TurnFix server running on port 3001

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

The jury portal will be available at:
- Local: http://localhost:5174/
- Network: http://[your-ip]:5174/

### Workflow

1. **Select Event**: Choose the competition event from the list
2. **Select Squad**: Pick the squad (Riege) that's currently competing
3. **Select Device**: Choose the apparatus/device for scoring
4. **Score Participants**: Enter scores for each participant in sequence

### API Integration

The jury portal connects to the main TurnFix API at `http://localhost:3001/api` and uses the following endpoints:
- `/events` - List all events
- `/squad-management` - Squad information by event
- `/disciplines` - Available devices/apparatus
- `/event-participants` - Participants by event and squad
- `/jury-results/save-field-score` - Save individual scores

### Device Icons

- Boden: 🤸
- Reck: 🏃
- Barren: 💪
- Pferd: 🏇
- Stufenbarren: 🤸‍♀️
- Schwebebalken: ⚖️
- Sprung: 🤾
- Ringe: 💍

## Network Access

For multi-device access on the same network, jury members can access the portal using your computer's IP address:
```
http://[your-computer-ip]:5174/
```

## Development Notes

This is a standalone React application that connects to the main TurnFix database. It's designed to be simple and focused, avoiding the complexity of the full dashboard interface that might confuse jury members during competitions.
