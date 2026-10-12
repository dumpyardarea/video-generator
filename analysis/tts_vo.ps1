# Draft voiceover with Windows SAPI (System.Speech): one WAV per line of a text file, for timing drafts only
# (it never ships: the real voice replaces it with analysis/swap_voice.py). Used by analysis/episode_vo.py.
#
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File analysis/tts_vo.ps1 -Script <lines.txt> -Work <dir> [-Voice "Microsoft Zira Desktop"] [-Rate 0]
param([Parameter(Mandatory = $true)][string]$Script, [Parameter(Mandatory = $true)][string]$Work, [string]$Voice = 'Microsoft Zira Desktop', [int]$Rate = 0)
Add-Type -AssemblyName System.Speech
New-Item -ItemType Directory -Force $Work | Out-Null
$lines = Get-Content $Script -Encoding UTF8 | Where-Object { $_.Trim() -ne '' }
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice($Voice)
$s.Rate = $Rate
$out = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
  $wav = Join-Path $Work ("line_{0:D3}.wav" -f $i)
  $s.SetOutputToWaveFile($wav, $fmt)
  $s.Speak([string]$lines[$i])
  $s.SetOutputToNull()
  $out += [pscustomobject]@{ text = [string]$lines[$i]; wav = $wav }
}
$s.Dispose()
$out | ConvertTo-Json -Depth 3 | Set-Content (Join-Path $Work 'tts.json') -Encoding UTF8
Write-Host "$($lines.Count) lines -> $Work"
