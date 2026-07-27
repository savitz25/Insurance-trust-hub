# Insurance Trust Hub — logo pipeline from transparent horizontal lockup
# Usage: powershell -ExecutionPolicy Bypass -File scripts/optimize-logo.ps1

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$candidates = @(
  "C:\Users\Michael.Savitsky\Consumer Trust Hub\logos for all verticals\InsuranceTrustHub-logo-transparent.png",
  (Join-Path $PSScriptRoot "..\public\brand\source\InsuranceTrustHub-logo-transparent.png")
)
$src = $null
foreach ($c in $candidates) {
  if (Test-Path $c) { $src = (Resolve-Path $c).Path; break }
}
if (-not $src) { throw "Source logo not found." }

$outDir = Join-Path $PSScriptRoot "..\public\brand"
$appDir = Join-Path $PSScriptRoot "..\app"
$pubDir = Join-Path $PSScriptRoot "..\public"
$sourceDir = Join-Path $outDir "source"
New-Item -ItemType Directory -Force -Path $outDir, $sourceDir | Out-Null
Copy-Item $src (Join-Path $sourceDir "InsuranceTrustHub-logo-transparent.png") -Force

function New-Bmp([int]$w, [int]$h) {
  if ($w -lt 1 -or $h -lt 1) { throw "Invalid size ${w}x${h}" }
  New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
}
function New-G($bmp) {
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  return $g
}
function Save-Png($bmp, $path) {
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "  $path ($($bmp.Width)x$($bmp.Height))"
}
function Resize-ToWidth($source, [int]$width) {
  $ratio = $width / $source.Width
  $height = [Math]::Max(1, [int][Math]::Round($source.Height * $ratio))
  $bmp = New-Bmp $width $height
  $g = New-G $bmp
  $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
  $g.DrawImage($source, 0, 0, $width, $height)
  $g.Dispose()
  return $bmp
}
function Pad-Square($source, [int]$size, [double]$fill = 0.82) {
  $side = [Math]::Max($source.Width, $source.Height)
  $scale = ($size * $fill) / $side
  $nw = [Math]::Max(1, [int][Math]::Round($source.Width * $scale))
  $nh = [Math]::Max(1, [int][Math]::Round($source.Height * $scale))
  $square = New-Bmp $size $size
  $g = New-G $square
  $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
  $g.DrawImage($source, [int](($size - $nw) / 2), [int](($size - $nh) / 2), $nw, $nh)
  $g.Dispose()
  return $square
}

$img = [System.Drawing.Image]::FromFile($src)
$master = New-Bmp $img.Width $img.Height
$gm = New-G $master
$gm.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
$gm.DrawImage($img, 0, 0, $img.Width, $img.Height)
$gm.Dispose()
$img.Dispose()
Write-Host "Source: $($master.Width)x$($master.Height)"

Save-Png $master (Join-Path $outDir "insurance-trust-hub-logo.png")
foreach ($pair in @(
  @(1600, "insurance-trust-hub-logo@2x.png"),
  @(1200, "insurance-trust-hub-logo-stacked.png"),
  @(600, "insurance-trust-hub-logo-stacked-sm.png"),
  @(1600, "insurance-trust-hub-logo-stacked@2x.png"),
  @(480, "insurance-trust-hub-logo-header.png"),
  @(960, "insurance-trust-hub-logo-header@2x.png")
)) {
  $r = Resize-ToWidth $master ([int]$pair[0])
  Save-Png $r (Join-Path $outDir $pair[1])
  $r.Dispose()
}

$iconX = [int]($master.Width * 0.62)
$iconRect = New-Object System.Drawing.Rectangle $iconX, 0, ($master.Width - $iconX), $master.Height
$iconCrop = $master.Clone($iconRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$icon512 = Pad-Square $iconCrop 512 0.82
Save-Png $icon512 (Join-Path $outDir "insurance-trust-hub-icon.png")
$icon192 = Pad-Square $iconCrop 192 0.82
Save-Png $icon192 (Join-Path $outDir "insurance-trust-hub-icon-192.png")
$icon32 = Pad-Square $iconCrop 32 0.88
Save-Png $icon32 (Join-Path $outDir "insurance-trust-hub-favicon-32.png")
$icon16 = Pad-Square $iconCrop 16 0.88
Save-Png $icon16 (Join-Path $outDir "insurance-trust-hub-favicon-16.png")

$icon512.Save((Join-Path $appDir "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$icon192.Save((Join-Path $appDir "apple-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
Save-Png $icon32 (Join-Path $pubDir "favicon.png")
Copy-Item (Join-Path $outDir "insurance-trust-hub-favicon-32.png") (Join-Path $pubDir "favicon.ico") -Force

$og = New-Bmp 1200 630
$go = New-G $og
$go.Clear([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
$maxW = 744; $maxH = 264
$scale = [Math]::Min($maxW / $master.Width, $maxH / $master.Height)
$nw = [int]($master.Width * $scale); $nh = [int]($master.Height * $scale)
$go.DrawImage($master, [int]((1200 - $nw) / 2), [int]((630 - $nh) / 2), $nw, $nh)
$go.Dispose()
Save-Png $og (Join-Path $outDir "insurance-trust-hub-og.png")

$svg = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" aria-hidden="true">
  <defs>
    <linearGradient id="g" x1="32" y1="8" x2="32" y2="56" gradientUnits="userSpaceOnUse">
      <stop stop-color="#1E6BFF"/>
      <stop offset="1" stop-color="#00A99D"/>
    </linearGradient>
  </defs>
  <path d="M32 8 L56 52 H8 Z" fill="url(#g)"/>
  <path d="M32 28 L44 52 H20 Z" fill="#00A99D"/>
  <rect x="46" y="8" width="6" height="14" rx="1" fill="#1E6BFF"/>
</svg>
"@
[System.IO.File]::WriteAllText((Join-Path $outDir "insurance-trust-hub-icon.svg"), $svg.Trim() + "`n")

$master.Dispose(); $iconCrop.Dispose()
$icon512.Dispose(); $icon192.Dispose(); $icon32.Dispose(); $icon16.Dispose(); $og.Dispose()
Write-Host "Done."
