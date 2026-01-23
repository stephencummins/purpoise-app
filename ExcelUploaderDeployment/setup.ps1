# Excel Uploader - Power Platform Deployment Script
# This script sets up SharePoint structure and can export/import Power Apps

param(
    [Parameter(Mandatory = $true)]
    [string]$SiteUrl,

    [Parameter(Mandatory = $false)]
    [string]$LibraryName = "ExcelUploads",

    [Parameter(Mandatory = $false)]
    [switch]$CreateLibrary = $false,

    [Parameter(Mandatory = $false)]
    [switch]$ExportApp = $false,

    [Parameter(Mandatory = $false)]
    [string]$AppName = "Excel Uploader",

    [Parameter(Mandatory = $false)]
    [string]$EnvironmentName
)

# Colour functions for output
function Write-Success { param($Message) Write-Host $Message -ForegroundColor Green }
function Write-Info { param($Message) Write-Host $Message -ForegroundColor Cyan }
function Write-Warn { param($Message) Write-Host $Message -ForegroundColor Yellow }
function Write-Err { param($Message) Write-Host $Message -ForegroundColor Red }

# Banner
Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "   Excel Uploader - Setup Script           " -ForegroundColor Magenta
Write-Host "   (Power Platform Edition)                " -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""

# Check for required modules
Write-Info "Checking required PowerShell modules..."

# Check PnP.PowerShell
if (-not (Get-Module -ListAvailable -Name PnP.PowerShell)) {
    Write-Warn "PnP.PowerShell module not found. Installing..."
    Install-Module -Name PnP.PowerShell -Force -AllowClobber -Scope CurrentUser
    Write-Success "PnP.PowerShell module installed."
} else {
    Write-Success "PnP.PowerShell module is available."
}

# Check Microsoft.PowerApps.Administration.PowerShell (optional)
if ($ExportApp) {
    if (-not (Get-Module -ListAvailable -Name Microsoft.PowerApps.Administration.PowerShell)) {
        Write-Warn "Power Apps Admin module not found. Installing..."
        Install-Module -Name Microsoft.PowerApps.Administration.PowerShell -Force -AllowClobber -Scope CurrentUser
        Write-Success "Power Apps Admin module installed."
    } else {
        Write-Success "Power Apps Admin module is available."
    }
}

Write-Host ""

# ============================================
# SHAREPOINT SETUP
# ============================================

if ($CreateLibrary) {
    Write-Info "Setting up SharePoint structure..."

    try {
        # Connect to SharePoint
        Write-Info "Connecting to SharePoint: $SiteUrl"
        Connect-PnPOnline -Url $SiteUrl -UseWebLogin
        Write-Success "Connected to SharePoint."

        # Check if library exists
        $existingLibrary = Get-PnPList -Identity $LibraryName -ErrorAction SilentlyContinue

        if ($existingLibrary) {
            Write-Warn "Library '$LibraryName' already exists. Skipping creation."
        } else {
            # Create document library
            Write-Info "Creating document library: $LibraryName"
            New-PnPList -Title $LibraryName -Template DocumentLibrary
            Write-Success "Document library created."
        }

        # Add custom columns
        Write-Info "Adding custom columns..."

        # Status column (Choice)
        $statusField = Get-PnPField -List $LibraryName -Identity "Status" -ErrorAction SilentlyContinue
        if (-not $statusField) {
            Add-PnPField -List $LibraryName -DisplayName "Status" -InternalName "Status" -Type Choice -Choices "Pending", "Processing", "Processed", "Error"
            Write-Success "Added 'Status' column."
        }

        # UploadedBy column (Text)
        $uploadedByField = Get-PnPField -List $LibraryName -Identity "UploadedBy" -ErrorAction SilentlyContinue
        if (-not $uploadedByField) {
            Add-PnPField -List $LibraryName -DisplayName "UploadedBy" -InternalName "UploadedBy" -Type Text
            Write-Success "Added 'UploadedBy' column."
        }

        # ProcessedDate column (DateTime)
        $processedDateField = Get-PnPField -List $LibraryName -Identity "ProcessedDate" -ErrorAction SilentlyContinue
        if (-not $processedDateField) {
            Add-PnPField -List $LibraryName -DisplayName "ProcessedDate" -InternalName "ProcessedDate" -Type DateTime
            Write-Success "Added 'ProcessedDate' column."
        }

        # ErrorMessage column (Note/Multiline)
        $errorMessageField = Get-PnPField -List $LibraryName -Identity "ErrorMessage" -ErrorAction SilentlyContinue
        if (-not $errorMessageField) {
            Add-PnPField -List $LibraryName -DisplayName "ErrorMessage" -InternalName "ErrorMessage" -Type Note
            Write-Success "Added 'ErrorMessage' column."
        }

        # Create Snapshots folder
        Write-Info "Creating Snapshots folder..."
        $snapshotsFolder = Get-PnPFolder -Url "$LibraryName/Snapshots" -ErrorAction SilentlyContinue
        if (-not $snapshotsFolder) {
            Add-PnPFolder -Name "Snapshots" -Folder $LibraryName
            Write-Success "Created 'Snapshots' folder."
        } else {
            Write-Warn "'Snapshots' folder already exists."
        }

        # Create monthly subfolders
        Write-Info "Creating monthly snapshot folders..."
        $currentYear = (Get-Date).Year
        $months = @("January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December")

        foreach ($month in $months) {
            $folderPath = "$LibraryName/Snapshots/$currentYear-$month"
            $existingFolder = Get-PnPFolder -Url $folderPath -ErrorAction SilentlyContinue
            if (-not $existingFolder) {
                Add-PnPFolder -Name "$currentYear-$month" -Folder "$LibraryName/Snapshots"
            }
        }
        Write-Success "Monthly folders created for $currentYear."

        Write-Host ""
        Write-Success "SharePoint structure setup complete!"

    } catch {
        Write-Err "Error setting up SharePoint: $_"
        exit 1
    } finally {
        Disconnect-PnPOnline -ErrorAction SilentlyContinue
    }
}

# ============================================
# POWER APPS EXPORT (Optional)
# ============================================

if ($ExportApp) {
    Write-Host ""
    Write-Info "Exporting Power App..."

    try {
        # Connect to Power Apps
        Add-PowerAppsAccount

        # Get environment
        if (-not $EnvironmentName) {
            Write-Info "Fetching default environment..."
            $environment = Get-AdminPowerAppEnvironment -Default
            $EnvironmentName = $environment.EnvironmentName
        }

        Write-Info "Using environment: $EnvironmentName"

        # Find the app
        $apps = Get-AdminPowerApp -EnvironmentName $EnvironmentName | Where-Object { $_.DisplayName -like "*$AppName*" }

        if ($apps.Count -eq 0) {
            Write-Err "No apps found matching '$AppName'"
            exit 1
        }

        if ($apps.Count -gt 1) {
            Write-Warn "Multiple apps found:"
            $apps | ForEach-Object { Write-Host "  - $($_.DisplayName)" }
            Write-Info "Please specify exact app name."
            exit 1
        }

        $app = $apps[0]
        Write-Info "Found app: $($app.DisplayName)"

        # Export the app
        $exportPath = ".\PowerApps\$($app.DisplayName -replace '[^a-zA-Z0-9]', '_').msapp"
        Export-AdminPowerApp -AppName $app.AppName -EnvironmentName $EnvironmentName -Path $exportPath

        Write-Success "App exported to: $exportPath"

    } catch {
        Write-Err "Error exporting Power App: $_"
    }
}

# ============================================
# SUMMARY
# ============================================

Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "           Setup Complete                  " -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""

Write-Info "Next steps:"
Write-Host ""
Write-Host "  1. CREATE POWER APP"
Write-Host "     - Go to https://make.powerapps.com"
Write-Host "     - Create new canvas app"
Write-Host "     - Follow instructions in PowerApps/BuildInstructions.md"
Write-Host ""
Write-Host "  2. IMPORT POWER AUTOMATE FLOW"
Write-Host "     - Go to https://make.powerautomate.com"
Write-Host "     - Import PowerAutomateFlow/ExcelUploaderFlow.json"
Write-Host "     - Configure connections"
Write-Host ""
Write-Host "  3. CONFIGURE POWER BI"
Write-Host "     - Connect to SharePoint folder: $SiteUrl/$LibraryName/Snapshots"
Write-Host "     - Apply DAX measures from PowerBI/PowerBI_DAX_Script.txt"
Write-Host ""
Write-Host "  4. TEST END-TO-END"
Write-Host "     - Upload a test Excel file"
Write-Host "     - Verify flow triggers"
Write-Host "     - Check Power BI refresh"
Write-Host ""

Write-Success "Setup script completed successfully."
