# Corre una fase de k6 y registra CPU/memoria de los contenedores mientras corre.
# Uso (raíz del repo, con las variables del paso 8 ya definidas):
#   .\tests\load\medir.ps1 -Fase baseline
#   .\tests\load\medir.ps1 -Fase spike -Script tests/load/participante.k6.js
param(
  [Parameter(Mandatory = $true)][string]$Fase,
  [string]$Script = 'tests/load/mixto.k6.js',
  [int]$CadaSegundos = 2
)

$inv = [System.Globalization.CultureInfo]::InvariantCulture
$dir = Join-Path $env:USERPROFILE 'k6-resultados'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$csv = Join-Path $dir "$Fase-recursos.csv"
$resumen = Join-Path $dir "$Fase-recursos.txt"
Remove-Item $csv, $resumen -ErrorAction SilentlyContinue

# Muestreo en segundo plano: una línea por contenedor cada ciclo.
$job = Start-Job -ArgumentList $csv, $CadaSegundos -ScriptBlock {
  param($ruta, $pausa)
  while ($true) {
    docker stats --no-stream --format '{{.Name}};{{.CPUPerc}};{{.MemUsage}}' |
      Add-Content -Path $ruta -Encoding utf8
    Start-Sleep -Seconds $pausa
  }
}

try {
  & k6 run -e "FASE=$Fase" "--summary-export=$dir\$Fase.json" $Script
  $codigoK6 = $LASTEXITCODE
}
finally {
  Stop-Job $job -ErrorAction SilentlyContinue
  Remove-Job $job -Force -ErrorAction SilentlyContinue
}

function A-MiB($texto) {
  if ($texto -match '^([\d\.]+)\s*([KMGT]?i?B)') {
    $n = [double]::Parse($Matches[1], $inv)
    switch -Regex ($Matches[2]) {
      '^KiB|^kB|^KB' { return $n / 1024 }
      '^MiB|^MB'     { return $n }
      '^GiB|^GB'     { return $n * 1024 }
      default        { return $n / 1048576 }
    }
  }
  return 0
}

if (-not (Test-Path $csv)) {
  Write-Host 'Sin muestras de docker stats.'
  exit $codigoK6
}

$filas = Get-Content $csv | Where-Object { $_ -match ';' } | ForEach-Object {
  $p = $_ -split ';'
  [pscustomobject]@{
    Contenedor = $p[0]
    CPU        = [double]::Parse(($p[1] -replace '%', '').Trim(), $inv)
    MemMiB     = A-MiB (($p[2] -split '/')[0].Trim())
  }
}

$tabla = $filas | Group-Object Contenedor | ForEach-Object {
  [pscustomobject]@{
    Contenedor = $_.Name
    'CPU pico %' = [math]::Round(($_.Group | Measure-Object CPU -Maximum).Maximum, 1)
    'Mem pico MiB' = [math]::Round(($_.Group | Measure-Object MemMiB -Maximum).Maximum, 0)
    Muestras = $_.Count
  }
} | Sort-Object Contenedor

Write-Host ''
Write-Host "== Picos de recursos: $Fase =="
$tabla | Format-Table -AutoSize | Out-String | Tee-Object -FilePath $resumen | Write-Host
Write-Host "Resumen: $resumen"
Write-Host "Código de salida k6: $codigoK6 (99 = umbral cruzado)"
exit $codigoK6
