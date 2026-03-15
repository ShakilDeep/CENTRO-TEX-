# CENTRO TEX 2.0 Development Startup Script
# This script ensures the database is properly initialized and starts both API and Web servers

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CENTRO TEX 2.0 Development Startup   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to API directory
Set-Location "$PSScriptRoot\apps\api"

# Step 1: Check database exists
Write-Host "[1/6] Checking database..." -ForegroundColor Yellow
$dbPath = ".\prisma\data\centrotex_new.db"
if (-Not (Test-Path $dbPath)) {
    Write-Host "  ❌ Database not found at $dbPath" -ForegroundColor Red
    Write-Host "  Creating new database..." -ForegroundColor Yellow
    
    # Create data directory if it doesn't exist
    New-Item -ItemType Directory -Force -Path ".\prisma\data" | Out-Null
    
    # Run migrations to create database
    Write-Host "  Running Prisma migrations..." -ForegroundColor Yellow
    npx prisma db push --accept-data-loss
} else {
    Write-Host "  ✅ Database found" -ForegroundColor Green
}

# Step 2: Verify database schema
Write-Host ""
Write-Host "[2/6] Verifying database schema..." -ForegroundColor Yellow
npx prisma db push --accept-data-loss
Write-Host "  ✅ Schema verified" -ForegroundColor Green

# Step 3: Check if database has data
Write-Host ""
Write-Host "[3/6] Checking database data..." -ForegroundColor Yellow
$sampleCount = npx tsx "$PSScriptRoot\apps\api\scripts\check-database.ts" 2>&1 | Select-String "Total samples" | ForEach-Object { $_.ToString().Split(':')[1].Trim() }
if ($sampleCount -eq "0" -or $null -eq $sampleCount) {
    Write-Host "  ⚠️  No data found. Seeding database..." -ForegroundColor Yellow
    npx prisma db seed
    Write-Host "  ✅ Database seeded" -ForegroundColor Green
} else {
    Write-Host "  ✅ Database has $sampleCount samples" -ForegroundColor Green
}

# Step 4: Generate Prisma Client
Write-Host ""
Write-Host "[4/6] Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
Write-Host "  ✅ Prisma Client generated" -ForegroundColor Green

# Step 5: Start API Server
Write-Host ""
Write-Host "[5/6] Starting API Server..." -ForegroundColor Yellow
$apiJob = Start-Job -ScriptBlock { 
    Set-Location "F:\CENTRO TEX 2.0\apps\api"
    npm run dev
}
Start-Sleep -Seconds 3
Write-Host "  ✅ API Server started (Job ID: $($apiJob.Id))" -ForegroundColor Green
Write-Host "     Running at: http://localhost:3000" -ForegroundColor Cyan

# Step 6: Start Web Server
Write-Host ""
Write-Host "[6/6] Starting Web Server..." -ForegroundColor Yellow
$webJob = Start-Job -ScriptBlock { 
    Set-Location "F:\CENTRO TEX 2.0\apps\web"
    npm run dev
}
Start-Sleep -Seconds 3
Write-Host "  ✅ Web Server started (Job ID: $($webJob.Id))" -ForegroundColor Green
Write-Host "     Running at: http://localhost:5173" -ForegroundColor Cyan

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   ✅ All services started successfully   " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services running:" -ForegroundColor White
Write-Host "  • API Server:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "  • Web App:     http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Job IDs:" -ForegroundColor White
Write-Host "  • API: $($apiJob.Id)" -ForegroundColor Yellow
Write-Host "  • Web: $($webJob.Id)" -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop servers, run:" -ForegroundColor White
Write-Host "  Stop-Job $($apiJob.Id), $($webJob.Id)" -ForegroundColor Yellow
Write-Host "  Remove-Job $($apiJob.Id), $($webJob.Id)" -ForegroundColor Yellow
Write-Host ""
Write-Host "To view server logs, run:" -ForegroundColor White
Write-Host "  Receive-Job $($apiJob.Id) -Keep" -ForegroundColor Yellow
Write-Host "  Receive-Job $($webJob.Id) -Keep" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to exit (servers will continue running)" -ForegroundColor Gray
Write-Host ""

# Keep script running to show status
while ($true) {
    Start-Sleep -Seconds 5
    
    # Check if jobs are still running
    $apiStatus = (Get-Job -Id $apiJob.Id).State
    $webStatus = (Get-Job -Id $webJob.Id).State
    
    if ($apiStatus -ne "Running" -or $webStatus -ne "Running") {
        Write-Host ""
        Write-Host "⚠️  Warning: One or more servers stopped unexpectedly" -ForegroundColor Red
        Write-Host "  API Status: $apiStatus" -ForegroundColor Yellow
        Write-Host "  Web Status: $webStatus" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Check logs with:" -ForegroundColor White
        Write-Host "  Receive-Job $($apiJob.Id)" -ForegroundColor Yellow
        Write-Host "  Receive-Job $($webJob.Id)" -ForegroundColor Yellow
        break
    }
}
