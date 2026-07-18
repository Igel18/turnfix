# Check event 4713 details
Write-Host "=== EVENT 4713 ANALYSIS ==="

# Get event details
$eventResp = Invoke-WebRequest -Uri 'http://localhost:3001/api/events/4713' -UseBasicParsing
$event = $eventResp.Content | ConvertFrom-Json
Write-Host "Event: $($event.var_eventname)"
Write-Host "Participants: $($event.participant_count)"
Write-Host "Scores: $($event.score_count)"

# Try to get squads for this event
$squadsResp = Invoke-WebRequest -Uri 'http://localhost:3001/api/squads?eventId=4713&limit=100' -UseBasicParsing -ErrorAction SilentlyContinue
if ($squadsResp) {
    $squads = $squadsResp.Content | ConvertFrom-Json
    Write-Host "`nSquads found: $($squads.squads.Length)"
    if ($squads.squads.Length -gt 0) {
        $squads.squads | Select-Object -First 5 | ForEach-Object { Write-Host "  - $_" }
    }
}

# Try to get disciplines for this event 
$disciplinesResp = Invoke-WebRequest -Uri 'http://localhost:3001/api/competitions?eventId=4713&limit=100' -UseBasicParsing -ErrorAction SilentlyContinue
if ($disciplinesResp) {
    $competitions = $disciplinesResp.Content | ConvertFrom-Json
    Write-Host "`nCompetitions/Disciplines: $($competitions.competitions.Length)"
    if ($competitions.competitions.Length -gt 0) {
        Write-Host "  Disciplines exist for this event"
    }
}

# Check raw squad-disciplines response
Write-Host "`n=== SQUAD-DISCIPLINES API ==="
$sdResp = Invoke-WebRequest -Uri 'http://localhost:3001/api/squad-disciplines?eventId=4713' -UseBasicParsing
$sd = $sdResp.Content | ConvertFrom-Json
Write-Host "Total: $($sd.total)"
Write-Host "Count: $($sd.squadDisciplines.Length)"
