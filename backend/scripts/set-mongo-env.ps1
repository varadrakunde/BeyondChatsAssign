# Usage: .\scripts\set-mongo-env.ps1 "mongodb+srv://user:pass@cluster/dbname?retryWrites=true&w=majority"
param(
  [Parameter(Mandatory=$true)][string]$MongoUrl
)
$envPath = Join-Path $PSScriptRoot "..\.env"
(Get-Content $envPath) -replace "^DATABASE_URL=.*$", "DATABASE_URL=`"$MongoUrl`"" | Set-Content $envPath
Write-Host "DATABASE_URL updated in .env"
