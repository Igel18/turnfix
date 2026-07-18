# Check which events actually exist
$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/events?limit=200' -UseBasicParsing
$events = $response.Content | ConvertFrom-Json

Write-Host "Total events: $($events.events.Length)"
Write-Host "Top 20 Event IDs (descending):"

$eventIds = $events.events | Select-Object -ExpandProperty int_eventid | Sort-Object -Descending | Select-Object -First 20
$eventIds | ForEach-Object { Write-Host "- $_" }

# Check if 4713 exists
$has4713 = $events.events | Where-Object { $_.int_eventid -eq 4713 }
Write-Host ""
if ($has4713) {
    Write-Host "Event 4713 found: $($has4713.var_eventname)"
} else {
    Write-Host "Event 4713 NOT found"
}
