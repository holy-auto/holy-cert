$ErrorActionPreference="Stop"
$ProgressPreference="SilentlyContinue"

function Find-MatchingBraceIndex([string]$s, [int]$openIdx) {
  $depth=0;$inS=$false;$inD=$false;$inT=$false;$esc=$false
  for($i=$openIdx;$i -lt $s.Length;$i++){
    $ch=$s[$i]
    if($esc){$esc=$false;continue}
    if(($inS -or $inD -or $inT) -and $ch -eq [char]92){$esc=$true;continue}
    if($inS){ if($ch -eq [char]39){$inS=$false}; continue }
    if($inD){ if($ch -eq [char]34){$inD=$false}; continue }
    if($inT){ if($ch -eq [char]96){$inT=$false}; continue }
    if($ch -eq [char]39){$inS=$true;continue}
    if($ch -eq [char]34){$inD=$true;continue}
    if($ch -eq [char]96){$inT=$true;continue}
    if($ch -eq "{"){$depth++;continue}
    if($ch -eq "}"){$depth--; if($depth -eq 0){return $i}}
  }
  return -1
}

$pf = "C:\Users\admin\holy-cert\src\lib\billing\planFeatures.ts"
$fk = "C:\Users\admin\holy-cert\src\lib\billing\featureKeys.ts"
Copy-Item -LiteralPath $pf "$pf.bak.fill-rows.$(Get-Date -Format yyyyMMdd-HHmmss)"

$pfTxt=[System.IO.File]::ReadAllText($pf)
$fkTxt=[System.IO.File]::ReadAllText($fk)

# FeatureIds from FEATURES
$mFeat=[regex]::Match($fkTxt,'(?m)^\s*export\s+const\s+FEATURES\s*=\s*\{')
if(-not $mFeat.Success){ throw "FEATURES not found" }
$openF=$mFeat.Index + $mFeat.Value.LastIndexOf("{")
$closeF=Find-MatchingBraceIndex $fkTxt $openF
if($closeF -lt 0){ throw "FEATURES brace not matched" }
$featBlock=$fkTxt.Substring($openF,$closeF-$openF+1)

$featureIds=New-Object 'System.Collections.Generic.HashSet[string]'
foreach($m in [regex]::Matches($featBlock,'(?m)^\s*(?:"(?<k>[^"]+)"|(?<k>[A-Za-z_][A-Za-z0-9_]*))\s*:')){
  $k=$m.Groups['k'].Value; if($k){ [void]$featureIds.Add($k) }
}
$featureList=@($featureIds) | Sort-Object

# Locate MATRIX block
$mMat=[regex]::Match($pfTxt,'(?m)^\s*(?:export\s+)?const\s+MATRIX\b[^{]*\{')
if(-not $mMat.Success){ throw "MATRIX not found" }
$openM=$mMat.Index + $mMat.Value.LastIndexOf("{")
$closeM=Find-MatchingBraceIndex $pfTxt $openM
if($closeM -lt 0){ throw "MATRIX brace not matched" }
$matrixBlock=$pfTxt.Substring($openM,$closeM-$openM+1)

# tiers (top-level keys in MATRIX)
$tiers = @()
foreach($m in [regex]::Matches($matrixBlock,'(?m)^\s{2}(?<t>[A-Za-z_]\w*)\s*:\s*\{')){
  $tiers += $m.Groups['t'].Value
}
$tiers = $tiers | Select-Object -Unique
if(-not $tiers -or $tiers.Count -eq 0){ throw "Could not detect tiers in MATRIX" }

Write-Host ("tiers=" + ($tiers -join ", "))

# Patch each tier object with missing keys: ["key"]: false,
$defaultVal = "false"

foreach($t in $tiers){
  # find tier object within MATRIX (relative search inside full file for simplicity)
  $re = [regex]("(?m)^\s{2}" + [regex]::Escape($t) + "\s*:\s*\{")
  $mt = $re.Match($matrixBlock)
  if(-not $mt.Success){ continue }

  $tierOpen = $openM + $mt.Index + $mt.Value.LastIndexOf("{")
  $tierClose = Find-MatchingBraceIndex $pfTxt $tierOpen
  if($tierClose -lt 0){ throw "tier brace not matched: $t" }
  $tierBlock = $pfTxt.Substring($tierOpen, $tierClose-$tierOpen+1)

  $present = New-Object 'System.Collections.Generic.HashSet[string]'
  foreach($mm in [regex]::Matches($tierBlock,'(?m)^\s*(?:"(?<k>[^"]+)"|(?<k>[A-Za-z_]\w*)|\[\s*"(?<k>[^"]+)"\s*\])\s*:')){
    $k=$mm.Groups['k'].Value; if($k){ [void]$present.Add($k) }
  }

  $missing = $featureList | Where-Object { -not $present.Contains($_) }
  Write-Host ("missing[" + $t + "]=" + $missing.Count)

  if($missing.Count -eq 0){ continue }

  $indent = "    " # tier内は4スペース想定
  $before = $pfTxt.Substring(0, $tierClose)
  $after  = $pfTxt.Substring($tierClose)

  foreach($k in $missing){
    $line = ('{0}["{1}"]: {2},' -f $indent, $k, $defaultVal)
    if($before -notmatch [regex]::Escape($line)){ $before += "`r`n" + $line }
  }

  $pfTxt = $before + $after
}

[System.IO.File]::WriteAllText($pf, $pfTxt, [System.Text.Encoding]::UTF8)

npm run build
if($LASTEXITCODE -ne 0){ throw "build failed (exit=$LASTEXITCODE)" }
