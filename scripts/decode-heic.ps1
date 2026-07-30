# Decode HEIC/HEIF (and pass through JPEG/PNG) to plain JPEG using the Windows
# Imaging Component, which has the HEVC decoder that sharp's bundled libheif
# lacks. Output feeds the normal sharp pipeline.
#
#   powershell -File scripts/decode-heic.ps1 -Src E:\ChanceBuilt -Dest <dir>

param(
  [Parameter(Mandatory = $true)][string]$Src,
  [Parameter(Mandatory = $true)][string]$Dest,
  [int]$MaxEdge = 2600,
  [int]$Quality = 92
)

Add-Type -AssemblyName PresentationCore, WindowsBase

if (-not (Test-Path $Dest)) { New-Item -ItemType Directory -Path $Dest -Force | Out-Null }

$exts = @('.heic', '.heif', '.jpg', '.jpeg', '.png')
$files = Get-ChildItem -Path $Src -File | Where-Object { $exts -contains $_.Extension.ToLower() } | Sort-Object Name

$ok = 0
$fail = 0

foreach ($f in $files) {
  $outName = [System.IO.Path]::GetFileNameWithoutExtension($f.Name) + '.jpg'
  $outPath = Join-Path $Dest $outName
  try {
    $stream = [System.IO.File]::OpenRead($f.FullName)
    $decoder = [System.Windows.Media.Imaging.BitmapDecoder]::Create(
      $stream, 'None', 'OnLoad')
    $frame = $decoder.Frames[0]

    # Apply EXIF orientation if WIC did not already normalise it.
    $source = [System.Windows.Media.Imaging.BitmapSource]$frame
    try {
      $meta = $frame.Metadata
      if ($meta -ne $null -and $meta.ContainsQuery('/app1/ifd/{ushort=274}')) {
        $orient = [int]$meta.GetQuery('/app1/ifd/{ushort=274}')
        $angle = switch ($orient) { 3 { 180 } 6 { 90 } 8 { 270 } default { 0 } }
        if ($angle -ne 0) {
          $rt = New-Object System.Windows.Media.RotateTransform($angle)
          $source = New-Object System.Windows.Media.Imaging.TransformedBitmap($source, $rt)
        }
      }
    } catch { }

    # Downscale so the long edge is at most $MaxEdge.
    $long = [Math]::Max($source.PixelWidth, $source.PixelHeight)
    if ($long -gt $MaxEdge) {
      $scale = $MaxEdge / $long
      $st = New-Object System.Windows.Media.ScaleTransform($scale, $scale)
      $source = New-Object System.Windows.Media.Imaging.TransformedBitmap($source, $st)
    }

    $encoder = New-Object System.Windows.Media.Imaging.JpegBitmapEncoder
    $encoder.QualityLevel = $Quality
    $encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($source))

    $outStream = [System.IO.File]::Open($outPath, 'Create')
    $encoder.Save($outStream)
    $outStream.Close()
    $stream.Close()

    $ok++
    Write-Output ("OK   {0} -> {1}x{2}" -f $f.Name, $source.PixelWidth, $source.PixelHeight)
  }
  catch {
    $fail++
    Write-Output ("FAIL {0}: {1}" -f $f.Name, $_.Exception.Message)
  }
}

Write-Output ("`nDecoded {0} file(s), {1} failure(s) -> {2}" -f $ok, $fail, $Dest)
