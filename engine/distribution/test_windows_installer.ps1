# Prueba real del instalador de Windows (ADR 034): instala, actualiza desde las versiones publicadas
# y desinstala. Comprueba que el programa nunca comparte carpeta con el historial y que el historial
# no se toca. Cambia el perfil del usuario, por eso solo corre en una máquina desechable de GitHub.
#
# Uso: pwsh engine/distribution/test_windows_installer.ps1 -Installer out/ARGUS_x.y.z_x64-setup.exe
param([Parameter(Mandatory)][string]$Installer)

$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true') {
  throw 'Esta prueba borra la instalación y el historial del perfil: solo corre en GitHub Actions.'
}

$DataFolder = Join-Path $env:LOCALAPPDATA 'ARGUS'
$ProgramFolder = Join-Path $env:LOCALAPPDATA 'Programs\ARGUS'
$CustomFolder = Join-Path $env:LOCALAPPDATA 'Mis programas\ARGUS'
$UninstallKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\ARGUS'
$ProductKey = 'HKCU:\Software\argus\ARGUS'
$Shortcuts = @(
  (Join-Path ([Environment]::GetFolderPath('Desktop')) 'ARGUS.lnk'),
  (Join-Path ([Environment]::GetFolderPath('Programs')) 'ARGUS.lnk')
)
$ProgramItems = @('argus.exe', 'uninstall.exe', 'engine', 'models', 'tesseract')
$Released = @{
  '0.1.1' = '810751baba93b1648068025655e21648225033cb250efb4164a4eb3764edd3c5'
  '0.1.2' = '4303a91814897ba7d732a1bf84b0c453466ab306e4cf327dcf2fb172368328b6'
}
$ReleasesUrl = 'https://github.com/ReveloSN/ARGOS_app_escritorio/releases/download'
$WaitSeconds = 120
$script:Failures = @()

function Assert-That([bool]$Condition, [string]$Message) {
  if ($Condition) { Write-Host "  ok     $Message"; return }
  Write-Host "  FALLA  $Message"
  $script:Failures += $Message
}

function Wait-Until([scriptblock]$Condition) {
  foreach ($second in 1..$WaitSeconds) {
    if (& $Condition) { return $true }
    Start-Sleep -Seconds 1
  }
  return $false
}

function Get-ReleasedInstaller([string]$Version) {
  $file = Join-Path $env:RUNNER_TEMP "ARGUS_${Version}_x64-setup.exe"
  if (-not (Test-Path $file)) {
    Invoke-WebRequest "$ReleasesUrl/v$Version/ARGUS_${Version}_x64-setup.exe" -OutFile $file
  }
  if ((Get-FileHash $file).Hash.ToLower() -ne $Released[$Version]) { throw "Suma inesperada: $file" }
  return $file
}

function Install-Argus([string]$Setup, [string]$Arguments = '/S') {
  $process = Start-Process $Setup -ArgumentList $Arguments -PassThru
  if (-not $process.WaitForExit($WaitSeconds * 5000)) { throw "El instalador no terminó: $Setup" }
  Assert-That ($process.ExitCode -eq 0) "el instalador termina bien ($Arguments)"
}

function Get-InstallLocation {
  if (-not (Test-Path $UninstallKey)) { return '' }
  return (Get-ItemProperty $UninstallKey).InstallLocation.Trim('"')
}

function Uninstall-Argus {
  $folder = Get-InstallLocation
  if (-not $folder) { return }
  Start-Process (Join-Path $folder 'uninstall.exe') -ArgumentList '/S' -Wait
  $gone = Wait-Until { -not (Test-Path $UninstallKey) -and -not (Test-Path (Join-Path $folder 'argus.exe')) }
  Assert-That $gone 'la desinstalación termina'
}

function Reset-Machine {
  Get-Process argus, argus-engine -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Seconds 2
  Uninstall-Argus
  Start-Sleep -Seconds 3
  $leftovers = @($DataFolder, $ProgramFolder, $CustomFolder, $UninstallKey, $ProductKey) + $Shortcuts
  foreach ($path in $leftovers) {
    if (Test-Path $path) { Remove-Item $path -Recurse -Force }
  }
}

function New-History {
  New-Item (Join-Path $DataFolder 'documents\sesion') -ItemType Directory -Force | Out-Null
  Set-Content (Join-Path $DataFolder 'argus.sqlite3') 'historial de prueba'
  Set-Content (Join-Path $DataFolder 'documents\sesion\contrato.txt') 'Contrato No. 4857'
}

function Get-HistoryHashes {
  $files = @('argus.sqlite3', 'documents\sesion\contrato.txt')
  return ($files | ForEach-Object {
      $path = Join-Path $DataFolder $_
      if (Test-Path $path) { (Get-FileHash $path).Hash } else { 'falta' }
    }) -join ','
}

function Assert-InstalledIn([string]$Folder) {
  Assert-That ((Get-InstallLocation) -eq $Folder) "queda registrado en $Folder"
  Assert-That (Test-Path (Join-Path $Folder 'engine\argus-engine.exe')) 'el motor queda junto al programa'
  Assert-That (Test-Path (Join-Path $Folder 'uninstall.exe')) 'el desinstalador queda junto al programa'
}

function Assert-NoProgramInDataFolder {
  foreach ($item in $ProgramItems) {
    Assert-That (-not (Test-Path (Join-Path $DataFolder $item))) "la carpeta del historial no tiene $item"
  }
}

function Assert-ShortcutsPointTo([string]$Folder) {
  $shell = New-Object -ComObject WScript.Shell
  foreach ($shortcut in $Shortcuts) {
    $target = if (Test-Path $shortcut) { $shell.CreateShortcut($shortcut).TargetPath } else { 'no existe' }
    Assert-That ($target -eq (Join-Path $Folder 'argus.exe')) "el acceso directo abre el programa ($shortcut)"
  }
}

function Test-CleanInstall {
  New-History
  $before = Get-HistoryHashes
  Install-Argus $Installer
  Assert-InstalledIn $ProgramFolder
  Assert-NoProgramInDataFolder
  Assert-ShortcutsPointTo $ProgramFolder
  Uninstall-Argus
  Assert-That ((Get-HistoryHashes) -eq $before) 'desinstalar no toca el historial'
}

function Test-Upgrade([string]$Version, [string]$Arguments) {
  Install-Argus (Get-ReleasedInstaller $Version)
  New-History
  $before = Get-HistoryHashes
  Install-Argus $Installer $Arguments
  Assert-InstalledIn $ProgramFolder
  Assert-NoProgramInDataFolder
  Assert-ShortcutsPointTo $ProgramFolder
  Assert-That ((Get-HistoryHashes) -eq $before) "actualizar desde $Version no toca el historial"
  Install-Argus $Installer
  Assert-InstalledIn $ProgramFolder
  Uninstall-Argus
  Assert-That ((Get-HistoryHashes) -eq $before) 'desinstalar después de actualizar no toca el historial'
}

function Test-UpgradeWhileRunning {
  Install-Argus (Get-ReleasedInstaller '0.1.2')
  Start-Process (Join-Path (Get-InstallLocation) 'argus.exe')
  $database = Join-Path $DataFolder 'argus.sqlite3'
  $running = Wait-Until { (Get-Process argus-engine -ErrorAction SilentlyContinue) -and (Test-Path $database) }
  Assert-That $running 'la versión anterior abre y crea su historial'
  Start-Sleep -Seconds 10
  Install-Argus $Installer
  Assert-InstalledIn $ProgramFolder
  Assert-NoProgramInDataFolder
  Assert-That (Test-Path $database) 'actualizar con la app abierta conserva el historial'
}

function Test-CustomFolder {
  Install-Argus (Get-ReleasedInstaller '0.1.2') "/S /D=$CustomFolder"
  New-History
  $before = Get-HistoryHashes
  Install-Argus $Installer
  Assert-InstalledIn $CustomFolder
  Assert-That ((Get-HistoryHashes) -eq $before) 'una carpeta elegida por la persona se respeta'
}

function Test-DataFolderChosenByHand {
  New-History
  $before = Get-HistoryHashes
  Install-Argus $Installer "/S /D=$DataFolder"
  Assert-InstalledIn $ProgramFolder
  Assert-NoProgramInDataFolder
  Assert-That ((Get-HistoryHashes) -eq $before) 'elegir la carpeta del historial no instala ahí'
}

$Installer = (Resolve-Path $Installer).Path
$scenarios = [ordered]@{
  'Instalación nueva'                    = { Test-CleanInstall }
  'Actualizar desde 0.1.1'               = { Test-Upgrade '0.1.1' '/S' }
  'Actualizar desde 0.1.2'               = { Test-Upgrade '0.1.2' '/S' }
  'Actualizar en modo actualización'     = { Test-Upgrade '0.1.2' '/S /UPDATE' }
  'Actualizar con la app abierta'        = { Test-UpgradeWhileRunning }
  'Carpeta elegida'                      = { Test-CustomFolder }
  'Carpeta del historial elegida a mano' = { Test-DataFolderChosenByHand }
}
foreach ($name in $scenarios.Keys) {
  Write-Host "== $name"
  Reset-Machine
  & $scenarios[$name]
}
Reset-Machine

if ($script:Failures.Count -gt 0) {
  Write-Host "$($script:Failures.Count) comprobaciones fallaron."
  exit 1
}
Write-Host 'Instalador correcto.'
exit 0
