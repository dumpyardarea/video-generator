# Placeholder voiceover for the frontend explainer: Windows SAPI (System.Speech), one WAV per script
# line plus the synthesizer's own word boundaries (SpeakProgress), so no forced alignment is needed.
# build_vo.py joins the lines and writes data/frontend/{lyrics,audio}.json.
#
#   powershell.exe -NoProfile -File analysis/frontend/tts_vo.ps1 [-Voice "Microsoft Zira Desktop"] [-Rate 0]
param([string]$Voice = 'Microsoft Zira Desktop', [int]$Rate = 0)
Add-Type -AssemblyName System.Speech
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$work = Join-Path $here 'work'
New-Item -ItemType Directory -Force $work | Out-Null
$lines = Get-Content (Join-Path $here 'script.txt') -Encoding UTF8 | Where-Object { $_.Trim() -ne '' }
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$out = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
  $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $s.SelectVoice($Voice)
  $s.Rate = $Rate
  $wav = Join-Path $work ("line_{0:D2}.wav" -f $i)
  $s.SetOutputToWaveFile($wav, $fmt)
  $src = "sp$i"
  Register-ObjectEvent -InputObject $s -EventName SpeakProgress -SourceIdentifier $src | Out-Null
  $s.Speak($lines[$i])
  $s.SetOutputToNull()
  $words = @()
  foreach ($e in (Get-Event -SourceIdentifier $src)) {
    $a = $e.SourceEventArgs
    $words += [pscustomobject]@{ text = $a.Text; pos = $a.CharacterPosition; len = $a.CharacterCount; ms = $a.AudioPosition.TotalMilliseconds }
    Remove-Event -EventIdentifier $e.EventIdentifier
  }
  Unregister-Event -SourceIdentifier $src
  $s.Dispose()
  $out += [pscustomobject]@{ text = [string]$lines[$i]; wav = $wav; words = $words }
}
$out | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $work 'tts.json') -Encoding UTF8
Write-Host "$($lines.Count) lines -> $work"
