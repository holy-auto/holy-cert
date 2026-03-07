$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Find-MatchingBraceIndex([string]$s, [int]$openIdx) {
  $depth = 0; $inS=$false; $inD=$false; $inT=$false; $esc=$false
  for ($i=$openIdx; $i -lt $s.Length; $i++) {
    $ch = $s[$i]
    if ($esc) { $esc=$false; continue }
    if (($inS -or $inD -or $inT) -and $ch -eq [char]92) { $esc=$true; continue } # backslash
    if ($inS) { if ($ch -eq [char]39) { $inS=$false }; continue } # '
    if ($inD) { if ($ch -eq [char]34) { $inD=$false }; continue } # "
    if ($inT) { if ($ch -eq [char]96) { $inT=$false }; continue } # `
    if ($ch -eq [char]39) { $inS=$true; continue }
    if ($ch -eq [char]34) { $inD=$true; continue }
    if ($ch -eq [char]96) { $inT=$true; continue }
    if ($ch -eq "{") { $depth++; continue }
    if ($ch -eq "}") { $depth--; if ($depth -eq 0) { return $i } }
  }
  return -1
}

function Get-Files([string]$srcRoot) {
  return @(
    Get-ChildItem -LiteralPath $srcRoot -Recurse -File -Filter *.ts
    Get-ChildItem -LiteralPath $srcRoot -Recurse -File -Filter *.tsx
  )
}

function Add-Key([System.Collections.Generic.HashSet[string]]$set, [string]$k) {
  if ([string]::IsNullOrWhiteSpace($k)) { return }
  if ($k -eq "null") { return }
  [void]$set.Add($k)
}

try {
  $root = (Resolve-Path ".").Path
  $src  = Join-Path $root "src"
  $fk   = Join-Path $root "src\lib\billing\featureKeys.ts"
  $rg   = Join-Path $root "src\app\admin\AdminRouteGuard.tsx"
  $fill = Join-Path $root "scripts\fill-matrix-rows.ps1"

  if (-not (Test-Path -LiteralPath $fk)) { throw "featureKeys.ts not found: $fk" }

  Write-Host "[1] Scan repo for used feature keys"
  $used = New-Object 'System.Collections.Generic.HashSet[string]'

  $files = Get-Files $src
  foreach ($ff in $files) {
    $txt = [System.IO.File]::ReadAllText($ff.FullName)

    # <AdminFeatureGuard feature="xxx">
    foreach ($m in [regex]::Matches($txt, 'feature\s*=\s*["''](?<k>[^"'']+)["'']')) {
      Add-Key $used $m.Groups['k'].Value
    }

    # adminFeatureGate("xxx")
    foreach ($m in [regex]::Matches($txt, '\badminFeatureGate\s*\(\s*["''](?<k>[^"'']+)["'']\s*\)')) {
      Add-Key $used $m.Groups['k'].Value
    }

    # FEATURES.xxx / BILLING_FEATURES.xxx
    foreach ($m in [regex]::Matches($txt, '\b(?:FEATURES|BILLING_FEATURES)\.(?<k>[A-Za-z_][A-Za-z0-9_]*)')) {
      Add-Key $used $m.Groups['k'].Value
    }

    # FEATURES["xxx"] / BILLING_FEATURES["xxx"]
    foreach ($m in [regex]::Matches($txt, '\b(?:FEATURES|BILLING_FEATURES)\s*\[\s*["''](?<k>[^"'']+)["'']\s*\]')) {
      Add-Key $used $m.Groups['k'].Value
    }
  }

  # AdminRouteGuard.tsx の return "xxx"（ここは限定スキャン）
  if (Test-Path -LiteralPath $rg) {
    $rtxt = [System.IO.File]::ReadAllText($rg)
    foreach ($m in [regex]::Matches($rtxt, '(?m)return\s+["''](?<k>[^"'']+)["'']\s*;')) {
      Add-Key $used $m.Groups['k'].Value
    }
  }

  Write-Host ("  used keys = " + $used.Count)

  Write-Host "[2] Parse existing FEATURES keys"
  $fkTxt = [System.IO.File]::ReadAllText($fk)

  $mFeat = [regex]::Match($fkTxt, '(?m)^\s*export\s+const\s+FEATURES\s*=\s*\{')
  if (-not $mFeat.Success) { throw "FEATURES object not found in featureKeys.ts" }

  $openF = $mFeat.Index + $mFeat.Value.LastIndexOf("{")
  $closeF = Find-MatchingBraceIndex $fkTxt $openF
  if ($closeF -lt 0) { throw "FEATURES brace not matched" }

  $featBlock = $fkTxt.Substring($openF, $closeF - $openF + 1)

  $existing = New-Object 'System.Collections.Generic.HashSet[string]'
  foreach ($m in [regex]::Matches($featBlock, '(?m)^\s*(?:"(?<k>[^"]+)"|(?<k>[A-Za-z_][A-Za-z0-9_]*))\s*:')) {
    Add-Key $existing $m.Groups['k'].Value
  }
  Write-Host ("  existing keys = " + $existing.Count)

  # diff
  $missing = @($used) | Where-Object { -not $existing.Contains($_) } | Sort-Object
  $unused  = @($existing) | Where-Object { -not $used.Contains($_) } | Sort-Object

  Write-Host ("[3] Missing keys to add = " + $missing.Count)
  if ($missing.Count -gt 0) { $missing | ForEach-Object { Write-Host ("  + " + $_) } }

  Write-Host ("[info] Unused keys (not removed) = " + $unused.Count)
  if ($unused.Count -gt 0) { $unused | Select-Object -First 20 | ForEach-Object { Write-Host ("  - " + $_) } }

  if ($missing.Count -gt 0) {
    Write-Host "[4] Patch featureKeys.ts"
    Copy-Item -LiteralPath $fk ($fk + ".bak." + (Get-Date -Format "yyyyMMdd-HHmmss"))

    # line-based insert: before the line that starts with "} as const"
    $lines = Get-Content -LiteralPath $fk
    $insAt = ($lines | Select-String -Pattern '^\s*\}\s+as\s+const' | Select-Object -First 1).LineNumber - 1
    if ($insAt -lt 0) { throw "Could not find `} as const` line in featureKeys.ts" }

    $pre  = if ($insAt -gt 0) { $lines[0..($insAt-1)] } else { @() }
    $post = $lines[$insAt..($lines.Count-1)]

    $addLines = @()
    foreach ($k in $missing) {
      $addLines += ('  "{0}": "{0}",' -f $k)   # 常に quoted で安全
    }

    $out = @($pre + $addLines + $post)
    Set-Content -LiteralPath $fk -Value $out -Encoding UTF8
  } else {
    Write-Host "[4] No patch needed for featureKeys.ts"
  }

  # MATRIX 自動補完（Feature追加後に追従）
  if (Test-Path -LiteralPath $fill) {
    Write-Host "[5] Fill MATRIX rows (scripts/fill-matrix-rows.ps1)"
    pwsh -NoProfile -ExecutionPolicy Bypass -File $fill
    if ($LASTEXITCODE -ne 0) { throw "fill-matrix-rows failed (exit=$LASTEXITCODE)" }
  } else {
    Write-Host "[5] Skip: scripts/fill-matrix-rows.ps1 not found"
  }

  Write-Host "[6] Build"
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "build failed (exit=$LASTEXITCODE)" }

  Write-Host "[DONE] sync-feature-registry OK"
}
catch {
  Write-Host "=== FAILED ==="
  $_ | Format-List * -Force
  throw
}
