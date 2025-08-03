# PowerShell script to update GCP Cloud Run services with new Docker images

# Function to load environment variables from .env file
function Load-EnvFile {
    param([string]$FilePath = ".env")
    
    if (-not (Test-Path $FilePath)) {
        Write-Error "Error: .env file not found!"
        exit 1
    }
    
    Get-Content $FilePath | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Load environment variables
Load-EnvFile

# Get environment variables
$GCP_PROJECT_ID = $env:GCP_PROJECT_ID
$GCP_REGION = $env:GCP_REGION
$REGISTRY = $env:REGISTRY
$TAG = $env:TAG

# Check if required variables are set
if (-not $GCP_PROJECT_ID -or -not $GCP_REGION -or -not $REGISTRY -or -not $TAG) {
    Write-Error "Error: Missing required environment variables!"
    Write-Error "Please ensure GCP_PROJECT_ID, GCP_REGION, REGISTRY, and TAG are set in .env file"
    exit 1
}

# Define services and their corresponding Cloud Run service names
$SERVICES = @{
    "issuer-backend" = "issuer-backend"
    "issuer-frontend" = "issuer-frontend"
    "verifier-backend" = "verifier-backend"
    "verifier-frontend" = "verifier-frontend"
    "smart-contracts-ui" = "smart-contracts-ui"
}

Write-Host "Updating Cloud Run services with new images..." -ForegroundColor Green
Write-Host "Project: $GCP_PROJECT_ID"
Write-Host "Region: $GCP_REGION"
Write-Host "Registry: $REGISTRY"
Write-Host "Tag: $TAG"
Write-Host "----------------------------------------"

# Function to update a single Cloud Run service
function Update-Service {
    param(
        [string]$ServiceName,
        [string]$ImageName
    )
    
    $FullImageUrl = "$REGISTRY/${ImageName}:$TAG"
    
    Write-Host "Updating $ServiceName with image: $FullImageUrl" -ForegroundColor Yellow
    
    $result = gcloud run deploy $ServiceName `
        --image=$FullImageUrl `
        --project=$GCP_PROJECT_ID `
        --region=$GCP_REGION `
        --quiet
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully updated $ServiceName" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Failed to update $ServiceName" -ForegroundColor Red
        return $false
    }
    Write-Host "----------------------------------------"
}

# Update all services
$FailedServices = @()
foreach ($ServiceName in $SERVICES.Keys) {
    $CloudRunServiceName = $SERVICES[$ServiceName]
    if (-not (Update-Service -ServiceName $CloudRunServiceName -ImageName $ServiceName)) {
        $FailedServices += $CloudRunServiceName
    }
}

# Summary
Write-Host "Deployment Summary:" -ForegroundColor Cyan
if ($FailedServices.Count -eq 0) {
    Write-Host "✅ All services updated successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to update the following services:" -ForegroundColor Red
    foreach ($Service in $FailedServices) {
        Write-Host "  - $Service" -ForegroundColor Red
    }
    exit 1
}