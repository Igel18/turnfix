# Generate squad-discipline combinations for event 4713
$body = @{
    eventId = 4713
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/squad-disciplines/generate' `
    -Method POST `
    -UseBasicParsing `
    -ContentType 'application/json' `
    -Body $body

$result = $response.Content | ConvertFrom-Json
Write-Host "Squad-Discipline Generation Result:"
$result | ConvertTo-Json -Depth 3
