param([switch]$WarnIfPublic)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

try {
    $profiles = @(Get-NetConnectionProfile)
} catch {
    [System.Windows.Forms.MessageBox]::Show("Die Netzwerkprofile konnten nicht gelesen werden: $($_.Exception.Message)", 'TurnFix', 'OK', 'Warning') | Out-Null
    exit 1
}

if ($WarnIfPublic -and -not @($profiles | Where-Object { $_.NetworkCategory -eq 'Public' }).Count) {
    exit 0
}

$form = New-Object System.Windows.Forms.Form
$form.Text = 'TurnFix - Netzwerkprofile'
$form.Size = New-Object System.Drawing.Size(620, 340)
$form.StartPosition = 'CenterScreen'
$form.MinimumSize = New-Object System.Drawing.Size(540, 300)

$description = New-Object System.Windows.Forms.Label
$description.Text = if ($WarnIfPublic) {
    'Mindestens eine Verbindung ist oeffentlich. TurnFix-Firewallregeln fuer private Netzwerke gelten dort nicht. Waehlen Sie nur ein vertrauenswuerdiges Netzwerk aus.'
} else {
    'Waehlen Sie eine Verbindung aus. Stellen Sie nur vertrauenswuerdige Netzwerke auf Privat.'
}
$description.SetBounds(12, 12, 580, 48)
$description.Anchor = 'Top, Left, Right'
$form.Controls.Add($description)

$list = New-Object System.Windows.Forms.ListBox
$list.SetBounds(12, 65, 580, 160)
$list.Anchor = 'Top, Bottom, Left, Right'
$form.Controls.Add($list)

$change = New-Object System.Windows.Forms.Button
$change.Text = 'Profil wechseln'
$change.SetBounds(12, 240, 150, 30)
$change.Anchor = 'Bottom, Left'
$form.Controls.Add($change)

$close = New-Object System.Windows.Forms.Button
$close.Text = 'Schliessen'
$close.SetBounds(442, 240, 150, 30)
$close.Anchor = 'Bottom, Right'
$close.Add_Click({ $form.Close() })
$form.Controls.Add($close)

function Refresh-Profiles {
    $script:profiles = @(Get-NetConnectionProfile)
    $list.Items.Clear()
    foreach ($profile in $script:profiles) {
        $category = switch ([string]$profile.NetworkCategory) {
            'Public' { 'Oeffentlich' }
            'Private' { 'Privat' }
            'DomainAuthenticated' { 'Domaene' }
            default { [string]$profile.NetworkCategory }
        }
        [void]$list.Items.Add("$($profile.Name) | $($profile.InterfaceAlias) | $category")
    }
    $change.Enabled = $false
}

$list.Add_SelectedIndexChanged({
    $change.Enabled = $list.SelectedIndex -ge 0 -and [string]$script:profiles[$list.SelectedIndex].NetworkCategory -in @('Public', 'Private')
})
$change.Add_Click({
    try {
        $selected = $script:profiles[$list.SelectedIndex]
        $current = Get-NetConnectionProfile -InterfaceIndex $selected.InterfaceIndex
        if ($current.InterfaceAlias -ne $selected.InterfaceAlias -or $current.Name -ne $selected.Name -or $current.NetworkCategory -ne $selected.NetworkCategory) {
            throw 'Die Verbindung hat sich geaendert. Bitte erneut auswaehlen.'
        }
        $target = if ([string]$current.NetworkCategory -eq 'Public') { 'Private' } else { 'Public' }
        $targetName = if ($target -eq 'Private') { 'Privat' } else { 'Oeffentlich' }
        $message = "Netzwerk '$($current.Name)' auf $targetName setzen?`n`nDie Einstellung betrifft den gesamten Computer und seine Firewall. Privat nur fuer vertrauenswuerdige Netzwerke verwenden."
        if ([System.Windows.Forms.MessageBox]::Show($message, 'Netzwerkprofil aendern', 'YesNo', 'Warning') -ne 'Yes') { return }
        $current = Get-NetConnectionProfile -InterfaceIndex $selected.InterfaceIndex
        if ($current.InterfaceAlias -ne $selected.InterfaceAlias -or $current.Name -ne $selected.Name -or $current.NetworkCategory -ne $selected.NetworkCategory) {
            throw 'Die Verbindung hat sich geaendert. Bitte erneut auswaehlen.'
        }
        Set-NetConnectionProfile -InterfaceIndex $selected.InterfaceIndex -NetworkCategory $target
        $updated = Get-NetConnectionProfile -InterfaceIndex $selected.InterfaceIndex
        if ([string]$updated.NetworkCategory -ne $target) { throw 'Windows hat die Aenderung nicht uebernommen.' }
        [System.Windows.Forms.MessageBox]::Show("Das Netzwerkprofil wurde auf $targetName gesetzt.", 'TurnFix', 'OK', 'Information') | Out-Null
        Refresh-Profiles
    } catch {
        [System.Windows.Forms.MessageBox]::Show("Das Netzwerkprofil konnte nicht geaendert werden: $($_.Exception.Message)", 'TurnFix', 'OK', 'Warning') | Out-Null
        try { Refresh-Profiles } catch { }
    }
})

Refresh-Profiles
[void]$form.ShowDialog()