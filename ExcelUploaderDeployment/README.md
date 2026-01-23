# Excel Uploader Solution

A complete Power Platform solution for uploading Excel files to SharePoint, automated processing with Power Automate, and variance analysis in Power BI.

## Overview

This solution enables:
- Uploading Excel files to SharePoint via **Power Apps** canvas app
- Validating and snapshotting files using Power Automate
- Performing variance analysis in Power BI

## Features

- **Simple file upload** - Easy file selection with validation
- **No-code deployment** - Built entirely with Power Platform
- **Automated validation and transformation** - Power Automate processes files on upload
- **Monthly snapshots** - Automatic archival for historical comparison
- **Variance analysis dashboard** - Power BI report with month-over-month analysis
- **Teams & SharePoint embedding** - Works anywhere in Microsoft 365

## Folder Structure

```
ExcelUploaderDeployment/
│
├── PowerApps/
│   ├── ExcelUploader_AppDefinition.yaml
│   ├── PowerFx_Formulas.txt
│   └── BuildInstructions.md
│
├── PowerAutomateFlow/
│   └── ExcelUploaderFlow.json
│
├── PowerBI/
│   └── PowerBI_DAX_Script.txt
│
├── DeploymentGuide.md
├── setup.ps1
└── README.md
```

## Quick Start

### Prerequisites

- Microsoft 365 licence with Power Apps
- SharePoint Online site
- Power Automate access
- Power BI Pro/Premium licence (for dashboards)

### 1. Create SharePoint Library

Create a document library called `ExcelUploads` with columns:
- Status (Choice): Pending, Processing, Processed, Error
- UploadedBy (Text)
- ProcessedDate (Date/Time)

### 2. Build the Power App

Follow the instructions in `PowerApps/BuildInstructions.md`:

1. Go to [make.powerapps.com](https://make.powerapps.com)
2. Create a new blank canvas app
3. Connect to your SharePoint library
4. Add the UI controls (file upload, button, status)
5. Copy formulas from `PowerApps/PowerFx_Formulas.txt`
6. Publish and share

### 3. Import Power Automate Flow

1. Go to [make.powerautomate.com](https://make.powerautomate.com)
2. Click **My flows** → **Import** → **Import Package**
3. Upload `PowerAutomateFlow/ExcelUploaderFlow.json`
4. Configure SharePoint connection
5. Enable the flow

### 4. Configure Power BI

1. Connect Power BI to SharePoint `Snapshots` folder
2. Apply DAX measures from `PowerBI/PowerBI_DAX_Script.txt`
3. Create visualisations and publish

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Power Apps    │────▶│  SharePoint      │────▶│  Power Automate │
│   Canvas App    │     │  Document Library│     │  Flow           │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                        ┌──────────────────┐              │
                        │  Power BI        │◀─────────────┘
                        │  Dashboard       │
                        └──────────────────┘
```

## Power Apps Configuration

The canvas app includes:

| Component | Purpose |
|-----------|---------|
| Attachments control | File picker for .xlsx files |
| Upload button | Triggers upload and flow |
| Progress indicator | Shows upload status |
| Status message | Success/error feedback |
| Recent uploads gallery | Shows user's uploaded files |

## DAX Measures

Key measures for variance analysis:

```dax
// Current vs Previous Month
CurrentMonthValue = CALCULATE(SUM('ExcelData'[Value]), ...)
PreviousMonthValue = CALCULATE(SUM('ExcelData'[Value]), ...)
Variance = [CurrentMonthValue] - [PreviousMonthValue]
VariancePercent = DIVIDE([Variance], [PreviousMonthValue], 0)

// Trend Indicators
TrendIndicator = SWITCH(TRUE(), [Variance] > 0, "▲", [Variance] < 0, "▼", "→")
```

See `PowerBI/PowerBI_DAX_Script.txt` for complete list.

## Deployment Checklist

- [ ] SharePoint document library created
- [ ] Library columns configured (Status, UploadedBy, etc.)
- [ ] Power App created and published
- [ ] Power Automate flow imported
- [ ] Flow connections configured
- [ ] Flow connected to Power App
- [ ] Power BI connected to SharePoint
- [ ] DAX measures applied
- [ ] Dashboard published
- [ ] App shared with users
- [ ] End-to-end testing completed

## Embedding Options

### SharePoint Page
1. Edit a SharePoint page
2. Add the **Power Apps** web part
3. Select your Excel Uploader app

### Microsoft Teams
1. Go to your Teams channel
2. Click **+** to add a tab
3. Select **Power Apps**
4. Choose Excel Uploader

### Teams Personal App
1. Go to Teams Admin Centre
2. Create a custom app package
3. Deploy to users

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Upload fails | Check SharePoint permissions |
| Flow not triggering | Verify flow connection in app |
| File not appearing | Refresh the gallery/library |
| "Network error" | Check internet connectivity |
| Attachments control missing | Ensure app is in Edit mode |

See [DeploymentGuide.md](DeploymentGuide.md) for detailed troubleshooting.

## Why Power Apps vs SPFx?

| Aspect | Power Apps | SPFx |
|--------|------------|------|
| Development | No-code/low-code | TypeScript/React |
| Deployment | Publish button | App Catalog + package |
| Maintenance | Easy updates | Build pipeline required |
| Customisation | Good for standard use | Full flexibility |
| Skills needed | Power Platform | Web development |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Licence

MIT Licence - See LICENCE file for details.

## Support

For issues or questions:
- Review the [Deployment Guide](DeploymentGuide.md)
- Check [Power Apps documentation](https://docs.microsoft.com/powerapps)
- Open an issue in this repository
