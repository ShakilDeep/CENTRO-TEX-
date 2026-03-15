Remove-Item "prisma\data\centrotex.db-shm" -Force -ErrorAction SilentlyContinue
Remove-Item "prisma\data\centrotex.db-wal" -Force -ErrorAction SilentlyContinue
Write-Output "Cleanup completed"
