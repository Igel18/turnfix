$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/squad-disciplines?eventId=4713' -UseBasicParsing
$data = $response.Content | ConvertFrom-Json
Write-Host "squadDisciplines count: $($data.squadDisciplines.Length)"
if ($data.squadDisciplines.Length -gt 0) {
    Write-Host "First entry:"
    $data.squadDisciplines[0] | ConvertTo-Json -Depth 3
} else {
    Write-Host "No squad-disciplines found for eventId=4713"
    Write-Host "Full Response:"
    $data | ConvertTo-Json -Depth 3
}
