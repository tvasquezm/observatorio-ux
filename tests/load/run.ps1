param(
  [ValidateSet('smoke','baseline','load25','load50','load100','load150','load200','load','stress','spike','soak')]
  [string]$Fase = 'smoke',
  [string]$Script = (Join-Path $PSScriptRoot 'mixto.k6.js'),
  [string]$ResultDir = (Join-Path $PSScriptRoot 'results'),
  [string]$K6Path = 'k6'
)
$ErrorActionPreference = 'Stop'
$executable = (Get-Command $K6Path -ErrorAction Stop).Source
$scriptPath = (Resolve-Path -LiteralPath $Script).Path
$runDir = Join-Path $ResultDir ("{0}-{1}" -f $Fase, [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $runDir | Out-Null
$runDir = (Resolve-Path -LiteralPath $runDir).Path
$stdout = Join-Path $runDir 'stdout.log'
$stderr = Join-Path $runDir 'stderr.log'
$summary = Join-Path $runDir 'summary.json'
$arguments = @('run', '--quiet', '-e', "FASE=$Fase", '--summary-export', "`"$summary`"", "`"$scriptPath`"")
Write-Host "k6: $Fase. Resultados: $runDir"
$timer = [System.Diagnostics.Stopwatch]::StartNew()
$process = Start-Process -FilePath $executable -ArgumentList $arguments -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
$null = $process.Handle
$peak = 0
$exitCode = $null
try {
  while (-not $process.HasExited) {
    try {
      $process.Refresh()
      $peak = [math]::Max($peak, $process.PeakWorkingSet64)
    } catch [System.InvalidOperationException] {
      if (-not $process.HasExited) { throw }
    }
    [void]$process.WaitForExit(100)
  }
  $process.WaitForExit()
  $exitCode = $process.ExitCode
} finally {
  $cancelled = -not $process.HasExited
  if ($cancelled) {
    Stop-Process -InputObject $process
    $process.WaitForExit()
    $exitCode = 130
  }
  $timer.Stop()
  $resources = [pscustomobject]@{
    fase = $Fase
    script = $scriptPath
    exitCode = $exitCode
    cancelled = $cancelled
    elapsedSeconds = [math]::Round($timer.Elapsed.TotalSeconds,2)
    k6PeakRamMiB = [math]::Round($peak / 1MB,2)
    sampleIntervalMs = 100
  } | ConvertTo-Json
  [IO.File]::WriteAllText((Join-Path $runDir 'resources.json'), $resources)
  $process.Dispose()
}
Get-Content -LiteralPath $stdout
Get-Content -LiteralPath $stderr
Write-Host ("Pico observado de RAM de k6: {0:N1} MiB; código: {1}" -f ($peak / 1MB), $exitCode)
exit $exitCode
