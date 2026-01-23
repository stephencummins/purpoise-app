# Excel Uploader Deployment Guide

This guide provides step-by-step instructions for deploying the Excel Uploader solution using Power Apps, Power Automate, and Power BI.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [SharePoint Setup](#sharepoint-setup)
3. [Power Apps Deployment](#power-apps-deployment)
4. [Power Automate Flow Setup](#power-automate-flow-setup)
5. [Power BI Configuration](#power-bi-configuration)
6. [Testing the Solution](#testing-the-solution)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Licence Requirements

- **Microsoft 365** with Power Apps included (E3/E5, Business Basic+)
- **Power Automate** (Standard included, Premium for HTTP triggers)
- **Power BI Pro or Premium** (for dashboard sharing)

### Access Requirements

- SharePoint Online Site Owner or Member access
- Power Platform environment access
- Power BI workspace contributor access

### Recommended Skills

- Basic SharePoint administration
- Power Apps canvas app development
- Power Automate flow creation
- Power BI report building

---

## SharePoint Setup

### Step 1: Create Document Library

1. Navigate to your SharePoint site
2. Click **+ New** → **Document library**
3. Name: `ExcelUploads`
4. Click **Create**

### Step 2: Add Custom Columns

Add the following columns to the library:

| Column Name | Type | Options |
|-------------|------|---------|
| Status | Choice | Pending, Processing, Processed, Error |
| UploadedBy | Single line of text | - |
| ProcessedDate | Date and time | - |
| ErrorMessage | Multiple lines of text | Plain text |

### Step 3: Create Snapshots Folder

1. Open the `ExcelUploads` library
2. Click **+ New** → **Folder**
3. Name: `Snapshots`

### Step 4: Configure Permissions

1. Click **Settings** (gear icon) → **Library settings**
2. Click **Permissions for this document library**
3. Ensure target users have at least **Contribute** access

---

## Power Apps Deployment

### Step 1: Create the App

1. Go to [make.powerapps.com](https://make.powerapps.com)
2. Click **+ Create** → **Blank app** → **Blank canvas app**
3. Enter app name: `Excel Uploader`
4. Select format: **Tablet** (recommended) or **Phone**
5. Click **Create**

### Step 2: Add Data Sources

1. In the left panel, click the **Data** icon (cylinder)
2. Click **+ Add data**
3. Search for **SharePoint**
4. Select your SharePoint site
5. Select the **ExcelUploads** library
6. Click **Connect**

### Step 3: Build the UI

Follow the detailed instructions in `PowerApps/BuildInstructions.md`.

**Quick Summary:**

1. **Header**: Add a rectangle and title label
2. **File Upload**: Insert an Attachments control
3. **Upload Button**: Add a Primary button
4. **Progress**: Add a slider or progress bar
5. **Status**: Add a label for messages
6. **Gallery**: Add a vertical gallery for recent uploads

### Step 4: Add Formulas

Copy the formulas from `PowerApps/PowerFx_Formulas.txt`:

1. **App.OnStart**: Initialise variables
2. **UploadButton.OnSelect**: File upload logic
3. **FileAttachment.OnChange**: Validation logic
4. **Gallery.Items**: Recent uploads query

### Step 5: Connect Power Automate Flow

1. Click **Power Automate** in the left panel
2. Click **+ Add flow**
3. Select your imported flow (or create new)
4. The flow will appear as a data source

### Step 6: Test in Studio

1. Press **F5** or click the **Play** button
2. Test file selection and upload
3. Verify files appear in SharePoint
4. Check for any errors

### Step 7: Publish

1. Click **File** → **Save**
2. Click **Publish**
3. Click **Publish this version**

### Step 8: Share the App

1. Click **Share** in the top-right
2. Enter user names or groups
3. Select permission level:
   - **User**: Can use the app
   - **Co-owner**: Can edit and share
4. Click **Share**

---

## Power Automate Flow Setup

### Step 1: Import the Flow

1. Go to [make.powerautomate.com](https://make.powerautomate.com)
2. Click **My flows** → **Import** → **Import Package (Legacy)**
3. Click **Upload** and select `PowerAutomateFlow/ExcelUploaderFlow.json`
4. Click **Import**

### Step 2: Configure Connections

During import, configure:

| Connection | Action |
|------------|--------|
| SharePoint | Select or create connection |
| Office 365 Outlook | Select or create connection |
| Power BI (optional) | Select or create connection |

### Step 3: Update Flow Settings

Open the flow and update:

1. **SharePoint Site URL**: Your site URL
2. **Library Name**: `ExcelUploads`
3. **Snapshots Folder**: `ExcelUploads/Snapshots`
4. **Notification Email**: Your admin email

### Step 4: Test the Flow

1. Click **Test** in the top-right
2. Select **Manually**
3. Provide test input:
   ```json
   {
     "fileName": "Test.xlsx",
     "uploaderEmail": "user@yourtenant.com",
     "uploadTime": "2024-01-15T10:30:00Z"
   }
   ```
4. Click **Run flow**
5. Verify all steps complete successfully

### Step 5: Enable the Flow

1. Ensure the flow is turned **On**
2. Note: Flows are on by default after import

---

## Power BI Configuration

### Step 1: Connect to SharePoint

1. Open **Power BI Desktop**
2. Click **Get Data** → **More...**
3. Select **SharePoint folder**
4. Enter: `https://yourtenant.sharepoint.com/sites/YourSite`
5. Click **OK**

### Step 2: Configure Data Source

1. Navigate to `ExcelUploads/Snapshots`
2. Click **Transform Data**
3. In Power Query Editor:
   - Filter to `.xlsx` files only
   - Expand binary content
   - Combine files

### Step 3: Add DAX Measures

1. Switch to **Report** view
2. In the Data pane, right-click your table
3. Select **New measure**
4. Add measures from `PowerBI/PowerBI_DAX_Script.txt`:

```dax
CurrentMonthValue =
CALCULATE(
    SUM('ExcelData'[Value]),
    FILTER('ExcelData', MONTH('ExcelData'[Date]) = MONTH(TODAY()))
)

PreviousMonthValue =
CALCULATE(
    SUM('ExcelData'[Value]),
    FILTER('ExcelData', MONTH('ExcelData'[Date]) = MONTH(TODAY()) - 1)
)

Variance = [CurrentMonthValue] - [PreviousMonthValue]

VariancePercent = DIVIDE([Variance], [PreviousMonthValue], 0)
```

### Step 4: Build Visualisations

Create the following:

1. **Card**: Current Month Value
2. **Card**: Variance %
3. **Line Chart**: Monthly Trend
4. **Table**: Detailed Breakdown
5. **KPI**: Target vs Actual

### Step 5: Publish to Service

1. Click **Publish**
2. Select your workspace
3. Click **Select**

### Step 6: Configure Refresh

1. Go to Power BI Service
2. Find your dataset
3. Click **...** → **Settings**
4. Under **Scheduled refresh**:
   - Turn on scheduled refresh
   - Set frequency (daily recommended)
   - Configure SharePoint credentials

---

## Testing the Solution

### Test 1: End-to-End Upload

1. Open the Power App
2. Select a valid `.xlsx` file
3. Click **Upload Excel**
4. Verify:
   - [ ] Progress indicator shows activity
   - [ ] Success message displays
   - [ ] File appears in SharePoint library

### Test 2: Flow Execution

1. Go to Power Automate
2. Check **Run history**
3. Verify:
   - [ ] Flow triggered successfully
   - [ ] Snapshot created
   - [ ] Email notification sent (if configured)

### Test 3: Power BI Refresh

1. Trigger a manual refresh
2. Open the report
3. Verify:
   - [ ] New data appears
   - [ ] Variance calculations update
   - [ ] Visualisations reflect changes

### Test 4: Error Handling

1. Try uploading a `.txt` file
2. Verify error message appears
3. Try uploading without selecting a file
4. Verify validation works

---

## Troubleshooting

### Power Apps Issues

| Issue | Solution |
|-------|----------|
| Attachments control not visible | Check app is in Edit mode |
| "Network error" on upload | Check SharePoint connection |
| Variables not working | Verify App.OnStart ran |
| Gallery empty | Check Items formula |

### Power Automate Issues

| Issue | Solution |
|-------|----------|
| Flow not triggering | Verify flow is enabled |
| Connection error | Re-authenticate connections |
| File not found | Check SharePoint path |
| Timeout error | Increase timeout settings |

### Power BI Issues

| Issue | Solution |
|-------|----------|
| Refresh failing | Re-enter SharePoint credentials |
| No data showing | Check data source path |
| DAX errors | Verify column names match |
| Gateway error | Configure/restart gateway |

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| 401 | Unauthorized | Re-authenticate |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Verify URLs/paths |
| 429 | Rate Limited | Wait and retry |
| 500 | Server Error | Check service status |

---

## Embedding Options

### Embed in SharePoint

1. Edit your SharePoint page
2. Click **+** to add a web part
3. Select **Power Apps**
4. Choose your Excel Uploader app

### Embed in Microsoft Teams

1. Go to your Teams channel
2. Click **+** to add a tab
3. Search for **Power Apps**
4. Select Excel Uploader

### Create Teams Personal App

1. Export app package from Power Apps
2. Upload to Teams Admin Centre
3. Deploy to users/groups

---

## Security Best Practices

1. **Least Privilege**: Grant minimum required permissions
2. **Data Classification**: Label sensitive Excel files appropriately
3. **Audit Logging**: Enable SharePoint audit logs
4. **Retention Policies**: Set up snapshot retention
5. **DLP Policies**: Apply Power Platform DLP policies

---

## Support

For issues:

1. Check this troubleshooting guide
2. Review Power Platform admin centre logs
3. Check SharePoint audit logs
4. Contact your IT administrator
