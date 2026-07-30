# Convert source video into something every browser can play.
#
#   powershell -File scripts/convert-videos.ps1 -Src E:\ChanceBuilt -Dest E:\autoshop\public\video
#
# iPhone records HEVC in a .mov container. Safari plays it; Chrome and Firefox
# do not, so publishing the originals would show most visitors a black box.
# This re-encodes to H.264 in MP4, which is the one combination that plays
# everywhere, and writes a poster frame alongside each clip.
#
# In production Cloudinary does this automatically on upload. This script is for
# converting an existing pile of files up front.

param(
  [Parameter(Mandatory = $true)][string]$Src,
  [Parameter(Mandatory = $true)][string]$Dest,
  # Cap the long edge. 1920 is plenty for a background; 4K just wastes bandwidth.
  [int]$MaxEdge = 1920,
  # Constant Rate Factor: lower is better quality and bigger. 23 is a good web default.
  [int]$Crf = 23
)

$ffmpeg = (Get-Command ffmpeg -ErrorAction SilentlyContinue).Source
if (-not $ffmpeg) { Write-Error "ffmpeg not found on PATH."; exit 1 }

if (-not (Test-Path $Dest)) { New-Item -ItemType Directory -Path $Dest -Force | Out-Null }

$files = Get-ChildItem -Path $Src -File | Where-Object { $_.Extension -match '^\.(mov|mp4|m4v|avi)$' }
if (-not $files) { Write-Output "No video files found in $Src"; exit 0 }

foreach ($f in $files) {
  $stem = [System.IO.Path]::GetFileNameWithoutExtension($f.Name).ToLower()
  $stem = ($stem -replace '[^a-z0-9]+', '-').Trim('-')
  if ($stem.Length -gt 40) { $stem = $stem.Substring(0, 40).Trim('-') }

  $mp4 = Join-Path $Dest "$stem.mp4"
  $jpg = Join-Path $Dest "$stem.jpg"

  # Scale so the long edge is at most $MaxEdge, keeping the aspect, and force
  # even dimensions because H.264 requires them.
  $scale = "scale='if(gt(iw,ih),min($MaxEdge,iw),-2)':'if(gt(iw,ih),-2,min($MaxEdge,ih))'"

  Write-Output "converting $($f.Name)"
  & $ffmpeg -y -loglevel error -i $f.FullName `
    -vf $scale `
    -c:v libx264 -profile:v high -crf $Crf -preset medium -pix_fmt yuv420p `
    -c:a aac -b:a 128k `
    -movflags +faststart `
    $mp4 2>&1 | Out-Null

  # Poster frame one second in, past any fade from black.
  & $ffmpeg -y -loglevel error -ss 1 -i $mp4 -frames:v 1 -q:v 3 $jpg 2>&1 | Out-Null

  if (Test-Path $mp4) {
    $inMb = "{0:N1}" -f ($f.Length / 1MB)
    $outMb = "{0:N1}" -f ((Get-Item $mp4).Length / 1MB)
    Write-Output "  $($f.Name)  $inMb MB  ->  $stem.mp4  $outMb MB"
  }
  else {
    Write-Output "  FAILED $($f.Name)"
  }
}

Write-Output "`nDone -> $Dest"
