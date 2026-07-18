$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/squad-disciplines?eventId=4713&limit=5' -UseBasicParsing
$data = $response.Content | ConvertFrom-Json
Write-Host "Squad-Disciplines for eventId=4713:"
Write-Host "Total: $($data.total)"
Write-Host "Returned: $($data.squadDisciplines.Length)"
if ($data.squadDisciplines.Length -gt 0) {
    Write-Host "`nFirst 3 entries:"
    $data.squadDisciplines | Select-Object -First 3 | ConvertTo-Json -Depth 3
}
