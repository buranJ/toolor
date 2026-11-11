# Run manually first. Schedule only after restore testing and ACL approval.
# No deletion/retention policy is imposed and no Telegram calls are made.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$appPath = 'C:\TOOLOR\app'
$runtimePath = 'C:\TOOLOR\runtime\node.exe'
$privateEnvPath = 'C:\ProgramData\TOOLOR\secrets\production.env'
$backupDirectory = 'C:\ProgramData\TOOLOR\backups'
if (!(Test-Path -LiteralPath $backupDirectory -PathType Container)) {
    throw 'Create and restrict the backup directory before running this script.'
}
$stamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
$archivePath = Join-Path $backupDirectory ("$stamp-" + [Guid]::NewGuid().ToString('N') + '.orders-backup.json')
Push-Location -LiteralPath $appPath
try {
    & $runtimePath --import tsx scripts/order-storage.ts backup-sqlite --env-file $privateEnvPath --file $archivePath
    if ($LASTEXITCODE -ne 0) { throw 'Backup failed. No automatic retry or file deletion.' }
    & $runtimePath --import tsx scripts/order-storage.ts verify --file $archivePath
    if ($LASTEXITCODE -ne 0) { throw 'Backup verification failed.' }
} finally {
    Pop-Location
}
