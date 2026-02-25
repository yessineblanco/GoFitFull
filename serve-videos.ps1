# Start the video storage server (Storage folder) on port 8080.
# Access from this machine: http://localhost:8080/
# Access from phone/emulator on same Wi-Fi: http://YOUR_PC_IP:8080/  (e.g. http://192.168.0.132:8080/)
# --host 0.0.0.0 allows connections from other devices on your network.

$StoragePath = Join-Path $PSScriptRoot "Storage"
if (-not (Test-Path $StoragePath)) {
    New-Item -ItemType Directory -Path $StoragePath | Out-Null
    Write-Host "Created Storage folder. Add your .mp4 files there, then run this script again."
}
Write-Host "Serving videos from: $StoragePath"
Write-Host "Local:   http://localhost:8080"
Write-Host "Network: http://192.168.0.132:8080 (use your PC's IP if different)"
Write-Host ""
npx --yes serve $StoragePath -p 8080 --host 0.0.0.0
