# ============================================================================
# TurnFix Documentation Builder
# ============================================================================
# Converts Markdown documentation to a standalone HTML file for distribution.
# Processes all .md files from documentation/newWebbased and creates a
# single-page HTML documentation with navigation sidebar.
#
# Usage:
#   .\build-docs.ps1 -OutputDir "staging\docs"
# ============================================================================

param(
    [string]$OutputDir = "",
    [string]$DocsDir = ""
)

$ErrorActionPreference = "Stop"

# === Resolve Paths ===
$ScriptDir = $PSScriptRoot
$InstallerDir = Split-Path $ScriptDir -Parent

if (-not $DocsDir) {
    $RepoRoot = Resolve-Path (Join-Path $InstallerDir "..\..")
    $DocsDir = Join-Path $RepoRoot "documentation\newWebbased"
}
if (-not $OutputDir) {
    $OutputDir = Join-Path $InstallerDir "staging\docs"
}

Write-Host "  📖 Building documentation..." -ForegroundColor Cyan
Write-Host "     Source: $DocsDir" -ForegroundColor Gray
Write-Host "     Output: $OutputDir" -ForegroundColor Gray

# Create output directory
New-Item -Path $OutputDir -ItemType Directory -Force | Out-Null

# === Copy images ===
$imagesSource = Join-Path $DocsDir "images\ui-screenshots"
$imagesTarget = Join-Path $OutputDir "images"
if (Test-Path $imagesSource) {
    New-Item -Path $imagesTarget -ItemType Directory -Force | Out-Null
    Copy-Item -Path "$imagesSource\*" -Destination $imagesTarget -Recurse -Force
    $imageCount = (Get-ChildItem $imagesTarget -File).Count
    Write-Host "     ✓ Copied $imageCount screenshots" -ForegroundColor Green
}

# === Collect all Markdown files ===
# Define the order based on SUMMARY.md structure
$docSections = @(
    @{ Title = "Einleitung"; File = "README.md"; Level = 0 },
    
    # Erste Schritte
    @{ Title = "Installation"; File = "getting-started\installation.md"; Level = 1 },
    @{ Title = "Schnellstart"; File = "getting-started\quickstart.md"; Level = 1 },
    
    # Benutzerhandbuch - Stammdaten
    @{ Title = "Regionen verwalten"; File = "user-guide\master-data\regions.md"; Level = 2 },
    @{ Title = "Verbände verwalten"; File = "user-guide\master-data\associations.md"; Level = 2 },
    @{ Title = "Vereine verwalten"; File = "user-guide\master-data\clubs.md"; Level = 2 },
    @{ Title = "Wettkampforte verwalten"; File = "user-guide\master-data\locations.md"; Level = 2 },
    @{ Title = "Athleten verwalten"; File = "user-guide\master-data\athletes.md"; Level = 2 },
    @{ Title = "Sportarten verwalten"; File = "user-guide\master-data\sports.md"; Level = 2 },
    @{ Title = "Disziplinen verwalten"; File = "user-guide\master-data\disciplines.md"; Level = 2 },
    @{ Title = "Disziplingruppen verwalten"; File = "user-guide\master-data\discipline-groups.md"; Level = 2 },
    @{ Title = "Disziplinfelder verwalten"; File = "user-guide\master-data\discipline-fields.md"; Level = 2 },
    @{ Title = "Formeln verwalten"; File = "user-guide\master-data\formulas.md"; Level = 2 },
    @{ Title = "Status verwalten"; File = "user-guide\master-data\status.md"; Level = 2 },
    @{ Title = "Urkundenlayouts verwalten"; File = "user-guide\master-data\certificate-layouts.md"; Level = 2 },
    
    # Feature-Guides
    @{ Title = "Wettkämpfe erstellen & verwalten"; File = "user-guide\event-competition-management.md"; Level = 1 },
    @{ Title = "Teilnehmer verwalten"; File = "user-guide\participant-management.md"; Level = 1 },
    @{ Title = "Zeitplanung"; File = "user-guide\time-planning.md"; Level = 1 },
    @{ Title = "Wertungserfassung"; File = "user-guide\score-capture.md"; Level = 1 },
    @{ Title = "Urkunden erstellen"; File = "user-guide\certificate-creation.md"; Level = 1 },
    @{ Title = "UI-Übersicht"; File = "user-guide\ui-overview.md"; Level = 1 },
    
    # Deployment
    @{ Title = "Produktiv-Deployment"; File = "deployment\production.md"; Level = 1 },
    @{ Title = "Netzwerk-Konfiguration"; File = "deployment\network.md"; Level = 1 },
    @{ Title = "Firewall"; File = "deployment\firewall.md"; Level = 1 },
    @{ Title = "Jury Portal Zugriff"; File = "deployment\jury-portal-access.md"; Level = 1 },
    @{ Title = "Troubleshooting"; File = "deployment\troubleshooting\node-modules-fix.md"; Level = 1 },

    # Referenz
    @{ Title = "Changelog"; File = "reference\changelog.md"; Level = 1 },
    @{ Title = "Update v2.0"; File = "reference\update-v2.md"; Level = 1 }
)

# === Simple Markdown to HTML converter ===
function Convert-MarkdownToHtml {
    param([string]$Markdown, [string]$BaseDir)
    
    $lines = $Markdown -split "`n"
    $html = [System.Collections.Generic.List[string]]::new()
    $inCodeBlock = $false
    $inList = $false
    $listType = ""
    $inTable = $false
    $tableRows = @()
    
    foreach ($rawLine in $lines) {
        $line = $rawLine.TrimEnd("`r")
        
        # Code blocks
        if ($line -match '^```(.*)$') {
            if ($inCodeBlock) {
                $html.Add("</code></pre>")
                $inCodeBlock = $false
            } else {
                $lang = $Matches[1]
                $html.Add("<pre class=`"code-block`"><code class=`"language-$lang`">")
                $inCodeBlock = $true
            }
            continue
        }
        
        if ($inCodeBlock) {
            $escaped = $line.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;")
            $html.Add($escaped)
            continue
        }
        
        # Table detection
        if ($line -match '^\|.*\|$') {
            if (-not $inTable) {
                $inTable = $true
                $tableRows = @()
            }
            # Skip separator rows
            if ($line -match '^\|[\s\-\|:]+\|$') { continue }
            $tableRows += $line
            continue
        } elseif ($inTable) {
            # End of table
            $html.Add("<div class=`"table-wrapper`"><table>")
            for ($i = 0; $i -lt $tableRows.Count; $i++) {
                $cells = $tableRows[$i].Trim('|').Split('|') | ForEach-Object { $_.Trim() }
                $tag = if ($i -eq 0) { "th" } else { "td" }
                $html.Add("<tr>")
                foreach ($cell in $cells) {
                    $cellHtml = Convert-InlineMarkdown $cell
                    $html.Add("<$tag>$cellHtml</$tag>")
                }
                $html.Add("</tr>")
            }
            $html.Add("</table></div>")
            $inTable = $false
            $tableRows = @()
        }
        
        # Close list if empty line
        if ($inList -and $line.Trim() -eq '') {
            $html.Add("</$listType>")
            $inList = $false
            continue
        }
        
        # Empty lines
        if ($line.Trim() -eq '') {
            continue
        }
        
        # Headers
        if ($line -match '^(#{1,6})\s+(.+)$') {
            if ($inList) { $html.Add("</$listType>"); $inList = $false }
            $level = $Matches[1].Length
            $text = $Matches[2]
            $id = ($text -replace '[^\w\s-]', '' -replace '\s+', '-').ToLower()
            $text = Convert-InlineMarkdown $text
            $html.Add("<h$level id=`"$id`">$text</h$level>")
            continue
        }
        
        # Unordered list items  
        if ($line -match '^(\s*)[-*]\s+(.+)$') {
            if (-not $inList -or $listType -ne 'ul') {
                if ($inList) { $html.Add("</$listType>") }
                $html.Add("<ul>")
                $inList = $true
                $listType = 'ul'
            }
            $text = Convert-InlineMarkdown $Matches[2]
            $html.Add("<li>$text</li>")
            continue
        }
        
        # Ordered list items
        if ($line -match '^\s*\d+\.\s+(.+)$') {
            if (-not $inList -or $listType -ne 'ol') {
                if ($inList) { $html.Add("</$listType>") }
                $html.Add("<ol>")
                $inList = $true
                $listType = 'ol'
            }
            $text = Convert-InlineMarkdown $Matches[1]
            $html.Add("<li>$text</li>")
            continue
        }
        
        # Blockquote
        if ($line -match '^>\s*(.*)$') {
            $text = Convert-InlineMarkdown $Matches[1]
            $html.Add("<blockquote>$text</blockquote>")
            continue
        }
        
        # Horizontal rule
        if ($line -match '^---+$' -or $line -match '^\*\*\*+$') {
            $html.Add("<hr>")
            continue
        }
        
        # Image (standalone line)
        if ($line -match '!\[([^\]]*)\]\(([^)]+)\)') {
            $alt = $Matches[1]
            $src = $Matches[2]
            # Fix relative image paths
            if ($src -match '^images/') {
                $src = $src
            } elseif ($src -match '^\.\./images/') {
                $src = $src -replace '^\.\./images/', 'images/'
            } elseif ($src -match 'ui-screenshots/') {
                $src = "images/" + ($src -replace '.*ui-screenshots/', '')
            }
            $html.Add("<div class=`"image-container`"><img src=`"$src`" alt=`"$alt`" loading=`"lazy`"><p class=`"image-caption`">$alt</p></div>")
            continue
        }
        
        # Regular paragraph
        if ($inList) { $html.Add("</$listType>"); $inList = $false }
        $text = Convert-InlineMarkdown $line
        $html.Add("<p>$text</p>")
    }
    
    # Close any open elements
    if ($inList) { $html.Add("</$listType>") }
    if ($inTable -and $tableRows.Count -gt 0) {
        $html.Add("<div class=`"table-wrapper`"><table>")
        for ($i = 0; $i -lt $tableRows.Count; $i++) {
            $cells = $tableRows[$i].Trim('|').Split('|') | ForEach-Object { $_.Trim() }
            $tag = if ($i -eq 0) { "th" } else { "td" }
            $html.Add("<tr>")
            foreach ($cell in $cells) {
                $cellHtml = Convert-InlineMarkdown $cell
                $html.Add("<$tag>$cellHtml</$tag>")
            }
            $html.Add("</tr>")
        }
        $html.Add("</table></div>")
    }
    if ($inCodeBlock) { $html.Add("</code></pre>") }
    
    return ($html -join "`n")
}

function Convert-InlineMarkdown {
    param([string]$Text)
    
    # Images inline
    $Text = $Text -replace '!\[([^\]]*)\]\(([^)]+)\)', '<img src="$2" alt="$1" class="inline-image">'
    # Links
    $Text = $Text -replace '\[([^\]]+)\]\(([^)]+)\)', '<a href="$2">$1</a>'
    # Bold + Italic
    $Text = $Text -replace '\*\*\*(.+?)\*\*\*', '<strong><em>$1</em></strong>'
    # Bold
    $Text = $Text -replace '\*\*(.+?)\*\*', '<strong>$1</strong>'
    # Italic
    $Text = $Text -replace '\*(.+?)\*', '<em>$1</em>'
    # Inline code
    $Text = $Text -replace '`([^`]+)`', '<code class="inline">$1</code>'
    # Checkboxes
    $Text = $Text -replace '\[x\]', '☑'
    $Text = $Text -replace '\[ \]', '☐'
    
    return $Text
}

# === Build the HTML ===
$sectionGroups = @(
    @{ Name = "📖 Einleitung"; Sections = @(0) },
    @{ Name = "🚀 Erste Schritte"; Sections = @(1, 2) },
    @{ Name = "📋 Stammdaten"; Sections = @(3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14) },
    @{ Name = "🏆 Wettkampf-Workflow"; Sections = @(15, 16, 17, 18, 19, 20) },
    @{ Name = "🚀 Deployment"; Sections = @(21, 22, 23, 24, 25) },
    @{ Name = "📚 Referenz"; Sections = @(26, 27) }
)

# Build navigation and content
$navHtml = [System.Collections.Generic.List[string]]::new()
$contentHtml = [System.Collections.Generic.List[string]]::new()
$sectionIndex = 0
$processedCount = 0

foreach ($group in $sectionGroups) {
    $navHtml.Add("<div class=`"nav-group`">")
    $navHtml.Add("<div class=`"nav-group-title`">$($group.Name)</div>")
    
    foreach ($idx in $group.Sections) {
        if ($idx -ge $docSections.Count) { continue }
        $section = $docSections[$idx]
        $filePath = Join-Path $DocsDir $section.File
        
        if (-not (Test-Path $filePath)) { 
            Write-Host "     ⚠ Skipped (not found): $($section.File)" -ForegroundColor Yellow
            continue 
        }
        
        $sectionId = "section-$sectionIndex"
        $indent = if ($section.Level -ge 2) { " nav-indent" } else { "" }
        $navHtml.Add("<a href=`"#$sectionId`" class=`"nav-item$indent`" onclick=`"showSection('$sectionId')`">$($section.Title)</a>")
        
        $markdown = Get-Content $filePath -Raw -Encoding UTF8
        $bodyHtml = Convert-MarkdownToHtml -Markdown $markdown -BaseDir (Split-Path $filePath -Parent)
        
        $contentHtml.Add("<section id=`"$sectionId`" class=`"doc-section`">")
        $contentHtml.Add($bodyHtml)
        $contentHtml.Add("</section>")
        
        $sectionIndex++
        $processedCount++
    }
    
    $navHtml.Add("</div>")
}

Write-Host "     ✓ Processed $processedCount documentation files" -ForegroundColor Green

# === Generate final HTML ===
$finalHtml = @"
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TurnFix v2.0 - Dokumentation</title>
<style>
:root {
    --primary: #2563eb;
    --primary-dark: #1d4ed8;
    --bg: #ffffff;
    --bg-sidebar: #f8fafc;
    --bg-code: #f1f5f9;
    --text: #1e293b;
    --text-secondary: #64748b;
    --border: #e2e8f0;
    --accent: #3b82f6;
    --sidebar-width: 280px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: var(--text);
    background: var(--bg);
    line-height: 1.7;
    font-size: 15px;
}

/* Sidebar */
.sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: var(--sidebar-width);
    height: 100vh;
    background: var(--bg-sidebar);
    border-right: 1px solid var(--border);
    overflow-y: auto;
    z-index: 100;
    display: flex;
    flex-direction: column;
}

.sidebar-header {
    padding: 20px;
    border-bottom: 1px solid var(--border);
    background: var(--primary);
    color: white;
    flex-shrink: 0;
}

.sidebar-header h1 {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 2px;
}

.sidebar-header .version {
    font-size: 12px;
    opacity: 0.85;
}

.sidebar-search {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
}

.sidebar-search input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;
}

.sidebar-search input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.sidebar-nav {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
}

.nav-group {
    margin-bottom: 4px;
}

.nav-group-title {
    padding: 10px 20px 6px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
}

.nav-item {
    display: block;
    padding: 6px 20px;
    color: var(--text);
    text-decoration: none;
    font-size: 13px;
    transition: all 0.15s;
    border-left: 3px solid transparent;
}

.nav-item:hover {
    background: #e2e8f0;
    color: var(--primary);
}

.nav-item.active {
    background: #dbeafe;
    color: var(--primary);
    border-left-color: var(--primary);
    font-weight: 600;
}

.nav-item.nav-indent {
    padding-left: 36px;
    font-size: 12.5px;
}

.nav-item.hidden {
    display: none;
}

/* Main content */
.main {
    margin-left: var(--sidebar-width);
    max-width: 900px;
    padding: 40px 60px;
}

.doc-section {
    display: none;
}

.doc-section.active {
    display: block;
}

/* Typography */
h1 { font-size: 2em; font-weight: 800; margin: 0 0 16px; color: var(--text); border-bottom: 2px solid var(--border); padding-bottom: 12px; }
h2 { font-size: 1.5em; font-weight: 700; margin: 32px 0 12px; color: var(--text); }
h3 { font-size: 1.25em; font-weight: 600; margin: 24px 0 10px; color: var(--text); }
h4 { font-size: 1.1em; font-weight: 600; margin: 20px 0 8px; color: var(--text-secondary); }
h5, h6 { font-size: 1em; font-weight: 600; margin: 16px 0 6px; color: var(--text-secondary); }

p { margin: 0 0 12px; }

a { color: var(--primary); text-decoration: none; }
a:hover { text-decoration: underline; }

strong { font-weight: 600; }

/* Lists */
ul, ol { margin: 0 0 12px 24px; }
li { margin: 4px 0; }

/* Code */
code.inline {
    background: var(--bg-code);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
    font-size: 0.9em;
    color: #c7254e;
}

pre.code-block {
    background: #1e293b;
    color: #e2e8f0;
    padding: 16px 20px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 12px 0 16px;
    font-size: 13px;
    line-height: 1.5;
}

pre.code-block code {
    font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
    background: none;
    color: inherit;
}

/* Tables */
.table-wrapper {
    overflow-x: auto;
    margin: 12px 0 16px;
}

table {
    border-collapse: collapse;
    width: 100%;
    font-size: 14px;
}

th, td {
    padding: 10px 14px;
    text-align: left;
    border: 1px solid var(--border);
}

th {
    background: var(--bg-sidebar);
    font-weight: 600;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

tr:nth-child(even) td {
    background: #fafbfc;
}

/* Blockquote */
blockquote {
    border-left: 4px solid var(--primary);
    padding: 12px 20px;
    margin: 12px 0;
    background: #eff6ff;
    border-radius: 0 6px 6px 0;
    color: var(--text);
}

/* Images */
.image-container {
    margin: 16px 0;
    text-align: center;
}

.image-container img {
    max-width: 100%;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    border: 1px solid var(--border);
}

.image-caption {
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 8px;
    font-style: italic;
}

.inline-image {
    max-width: 100%;
    border-radius: 4px;
}

/* Horizontal rule */
hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 24px 0;
}

/* Footer */
.footer {
    margin-top: 60px;
    padding: 20px 0;
    border-top: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 13px;
    text-align: center;
}

/* Print styles */
@media print {
    .sidebar { display: none; }
    .main { margin-left: 0; max-width: 100%; padding: 20px; }
    .doc-section { display: block !important; page-break-before: always; }
    .doc-section:first-child { page-break-before: auto; }
    pre.code-block { background: #f5f5f5 !important; color: #333 !important; border: 1px solid #ddd; }
}

/* Mobile */
@media (max-width: 768px) {
    .sidebar { width: 100%; height: auto; position: relative; }
    .main { margin-left: 0; padding: 20px; }
    .sidebar-nav { max-height: 300px; }
}

/* Scrollbar */
.sidebar-nav::-webkit-scrollbar { width: 6px; }
.sidebar-nav::-webkit-scrollbar-track { background: transparent; }
.sidebar-nav::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
.sidebar-nav::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>
</head>
<body>

<div class="sidebar">
    <div class="sidebar-header">
        <h1>📖 TurnFix Dokumentation</h1>
        <div class="version">Version 2.0</div>
    </div>
    <div class="sidebar-search">
        <input type="text" id="searchInput" placeholder="🔍 Suchen..." oninput="filterNav(this.value)">
    </div>
    <nav class="sidebar-nav">
        $($navHtml -join "`n        ")
    </nav>
</div>

<main class="main">
    $($contentHtml -join "`n    ")
    
    <div class="footer">
        <p>TurnFix v2.0 - Turnwettkampf-Verwaltung | Generiert am $(Get-Date -Format 'dd.MM.yyyy')</p>
    </div>
</main>

<script>
// Show first section by default
function showSection(id) {
    document.querySelectorAll('.doc-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const section = document.getElementById(id);
    if (section) {
        section.classList.add('active');
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    const navItem = document.querySelector('a[onclick*="' + id + '"]');
    if (navItem) navItem.classList.add('active');
}

// Search/filter navigation
function filterNav(query) {
    const items = document.querySelectorAll('.nav-item');
    const q = query.toLowerCase();
    
    if (!q) {
        items.forEach(item => item.classList.remove('hidden'));
        return;
    }
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(q)) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });
}

// Activate first section on load
document.addEventListener('DOMContentLoaded', () => {
    const firstSection = document.querySelector('.doc-section');
    const firstNav = document.querySelector('.nav-item');
    if (firstSection) firstSection.classList.add('active');
    if (firstNav) firstNav.classList.add('active');
});

// Handle hash navigation
if (window.location.hash) {
    const id = window.location.hash.substring(1);
    setTimeout(() => showSection(id), 100);
}
</script>

</body>
</html>
"@

# Write the HTML file
$outputFile = Join-Path $OutputDir "TurnFix-Dokumentation.html"
[System.IO.File]::WriteAllText($outputFile, $finalHtml, [System.Text.Encoding]::UTF8)

$fileSize = [math]::Round((Get-Item $outputFile).Length / 1KB, 1)
Write-Host "  ✓ Documentation built: $outputFile ($fileSize KB)" -ForegroundColor Green
