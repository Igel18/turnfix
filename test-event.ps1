# Check if event 4713 exists
$eventResponse = Invoke-WebRequest -Uri 'http://localhost:3001/api/events?eventId=4713' -UseBasicParsing
$events = $eventResponse.Content | ConvertFrom-Json

Write-Host "Events found:"
$events | ConvertTo-Json -Depth 3

# Also check all squad-disciplines from database
Write-Host "`n`nChecking squad-disciplines for this event..."
$sdResponse = Invoke-WebRequest -Uri 'http://localhost:3001/api/squad-disciplines?eventId=4713&limit=100' -UseBasicParsing
$sds = $sdResponse.Content | ConvertFrom-Json

Write-Host "Squad-disciplines found: $($sds.squadDisciplines.Length)"
if ($sds.squadDisciplines.Length -eq 0) {
    Write-Host "No squad-disciplines for eventId=4713"
    Write-Host "Event might not have squads/disciplines set up"
}
