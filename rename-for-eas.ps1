# Fix EAS Build: Rename GoFitMobile -> gofitmobile for case-sensitive Linux match
# Run this with Expo/IDE closed (folder must not be in use)
# From: GoFit repo root

Set-Location $PSScriptRoot
if (-not (Test-Path "GoFitMobile")) { Write-Error "GoFitMobile folder not found"; exit 1 }
git mv GoFitMobile gofitmobile
Write-Host "Done. Run: cd gofitmobile; eas build --profile development --platform android"
