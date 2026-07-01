# Insurance Trust Hub — logo pipeline (true transparency + header-safe padding)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/optimize-logo.ps1

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$src = "C:\Users\Michael.Savitsky\logos\insuranceTH.png"
if (-not (Test-Path $src)) { $src = Join-Path $PSScriptRoot "..\..\logos\insuranceTH.png" }
$outDir = Join-Path $PSScriptRoot "..\public\brand"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-TransparentBitmap([int]$width, [int]$height) {
    $bmp = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    $g.Dispose()
    return $bmp
}

function New-Graphics($bmp) {
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    return $g
}

function Save-Png($bitmap, $path) {
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "  $path ($($bitmap.Width)x$($bitmap.Height))"
}

function To-ArgbBitmap($image) {
    if ($image.PixelFormat -eq [System.Drawing.Imaging.PixelFormat]::Format32bppArgb) { return $image }
    $bmp = New-TransparentBitmap $image.Width $image.Height
    $g = New-Graphics $bmp
    $g.DrawImage($image, 0, 0, $image.Width, $image.Height)
    $g.Dispose()
    return $bmp
}

function Resize-Bitmap($source, $width) {
    $src = To-ArgbBitmap $source
    $ratio = $width / $src.Width
    $height = [int]($src.Height * $ratio)
    $bmp = New-TransparentBitmap $width $height
    $g = New-Graphics $bmp
    $g.DrawImage($src, 0, 0, $width, $height)
    $g.Dispose()
    if ($src -ne $source) { $src.Dispose() }
    return $bmp
}

function Crop-Bitmap($source, $x, $y, $w, $h) {
    $rect = New-Object System.Drawing.Rectangle $x, $y, $w, $h
    return $source.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
}

function Trim-Transparent($bitmap) {
    $bmp = To-ArgbBitmap $bitmap
    $w = $bmp.Width; $h = $bmp.Height
    $minX = $w; $minY = $h; $maxX = 0; $maxY = 0
    $data = $bmp.LockBits(
        (New-Object System.Drawing.Rectangle 0, 0, $w, $h),
        [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $stride = $data.Stride
    $bytes = New-Object byte[] ($stride * $h)
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
    $bmp.UnlockBits($data)
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $i = $y * $stride + $x * 4
            if ($bytes[$i + 3] -gt 20) {
                if ($x -lt $minX) { $minX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    if ($maxX -le $minX) { return $bmp }
    return Crop-Bitmap $bmp $minX $minY ($maxX - $minX + 1) ($maxY - $minY + 1)
}

function Add-Padding($bitmap, [double]$padTop, [double]$padBottom, [double]$padLeft, [double]$padRight) {
    $bmp = Trim-Transparent $bitmap
    $pt = [int]($bmp.Height * $padTop)
    $pb = [int]($bmp.Height * $padBottom)
    $pl = [int]($bmp.Width * $padLeft)
    $pr = [int]($bmp.Width * $padRight)
    $cw = $bmp.Width + $pl + $pr
    $ch = $bmp.Height + $pt + $pb
    $canvas = New-TransparentBitmap $cw $ch
    $g = New-Graphics $canvas
    $g.DrawImage($bmp, $pl, $pt, $bmp.Width, $bmp.Height)
    $g.Dispose()
    return $canvas
}

function Remove-CheckerboardArtifacts($bitmap) {
    $bmp = To-ArgbBitmap $bitmap
    $w = $bmp.Width; $h = $bmp.Height
    $data = $bmp.LockBits(
        (New-Object System.Drawing.Rectangle 0, 0, $w, $h),
        [System.Drawing.Imaging.ImageLockMode]::ReadWrite,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $stride = $data.Stride
    $bytes = New-Object byte[] ($stride * $h)
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $i = $y * $stride + $x * 4
            $b = $bytes[$i]; $g = $bytes[$i + 1]; $r = $bytes[$i + 2]; $a = $bytes[$i + 3]
            if ($a -lt 10) { continue }
            $isBrandBlue = ($b -gt $r + 8) -and ($r -lt 80)
            $isDark = ($r -lt 90) -and ($g -lt 90) -and ($b -lt 120)
            if ($isBrandBlue -or $isDark) { continue }
            $isNeutral = ([Math]::Abs($r - $g) -lt 12) -and ([Math]::Abs($g - $b) -lt 12)
            $isLight = ($r -gt 160) -and ($g -gt 160) -and ($b -gt 160)
            if ($isNeutral -and $isLight) {
                $bytes[$i] = 0; $bytes[$i + 1] = 0; $bytes[$i + 2] = 0; $bytes[$i + 3] = 0
            }
        }
    }
    [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
    $bmp.UnlockBits($data)
    return $bmp
}

function Pad-Square($bitmap, $size, [double]$fillRatio = 0.72) {
    $bmp = Trim-Transparent $bitmap
    $side = [Math]::Max($bmp.Width, $bmp.Height)
    $scale = ($size * $fillRatio) / $side
    $nw = [int]($bmp.Width * $scale)
    $nh = [int]($bmp.Height * $scale)
    $scaled = Resize-Bitmap $bmp $nw
    $square = New-TransparentBitmap $size $size
    $g = New-Graphics $square
    $g.DrawImage($scaled, [int](($size - $nw) / 2), [int](($size - $nh) / 2), $nw, $nh)
    $g.Dispose()
    $scaled.Dispose()
    return (Remove-CheckerboardArtifacts $square)
}

# ── Load source ──────────────────────────────────────────────────────────────
$original = To-ArgbBitmap ([System.Drawing.Image]::FromFile($src))
$w = $original.Width; $h = $original.Height
Write-Host "Source: $w x $h"

# Stacked — full logo with padding
$stackedPadded = Add-Padding $original 0.04 0.06 0.04 0.04
$stackedClean = Remove-CheckerboardArtifacts $stackedPadded
Save-Png $stackedClean (Join-Path $outDir "insurance-trust-hub-logo-stacked@2x.png")
Save-Png (Remove-CheckerboardArtifacts (Resize-Bitmap $stackedClean 1200)) (Join-Path $outDir "insurance-trust-hub-logo-stacked.png")
Save-Png (Remove-CheckerboardArtifacts (Resize-Bitmap $stackedClean 600)) (Join-Path $outDir "insurance-trust-hub-logo-stacked-sm.png")

# Icon — crop umbrella emblem (top ~62% of image)
$iconRaw = Crop-Bitmap $original ([int]($w * 0.06)) ([int]($h * 0.01)) ([int]($w * 0.88)) ([int]($h * 0.62))
$icon = Remove-CheckerboardArtifacts (Trim-Transparent $iconRaw)
$icon = Add-Padding $icon 0.08 0.14 0.08 0.08

$icon512 = Pad-Square $icon 512 0.64
Save-Png $icon512 (Join-Path $outDir "insurance-trust-hub-icon.png")
$icon192 = Pad-Square $icon 192 0.64
Save-Png $icon192 (Join-Path $outDir "insurance-trust-hub-icon-192.png")
$icon32 = Pad-Square $icon 32 0.64
Save-Png $icon32 (Join-Path $outDir "insurance-trust-hub-favicon-32.png")

$icon512.Save((Join-Path $PSScriptRoot "..\app\icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$icon192.Save((Join-Path $PSScriptRoot "..\app\apple-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "  app/icon.png + app/apple-icon.png"

$original.Dispose(); $stackedPadded.Dispose(); $stackedClean.Dispose()
$iconRaw.Dispose(); $icon.Dispose()
$icon512.Dispose(); $icon192.Dispose(); $icon32.Dispose()
Write-Host "Done."