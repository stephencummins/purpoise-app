# Excel Uploader - Power Apps Build Instructions

Follow these steps to create the Excel Uploader canvas app from scratch.

## Prerequisites

- Power Apps licence (included with Microsoft 365)
- SharePoint Online site with a document library
- Power Automate access (for flow integration)

## Step 1: Create SharePoint Document Library

1. Go to your SharePoint site
2. Click **New** → **Document library**
3. Name it `ExcelUploads`
4. Add these columns:
   - **Status** (Choice): Pending, Processing, Processed, Error
   - **UploadedBy** (Single line of text)
   - **ProcessedDate** (Date and time)
   - **ErrorMessage** (Multiple lines of text)

## Step 2: Create the Canvas App

1. Go to [make.powerapps.com](https://make.powerapps.com)
2. Click **+ Create** → **Blank app** → **Blank canvas app**
3. Name: `Excel Uploader`
4. Format: **Tablet** (or Phone for mobile-first)
5. Click **Create**

## Step 3: Connect Data Sources

1. In the left panel, click **Data** (cylinder icon)
2. Click **+ Add data**
3. Search for **SharePoint**
4. Select your SharePoint site
5. Select the **ExcelUploads** library
6. Click **Connect**

## Step 4: Add Power Automate Flow

1. Click **Power Automate** in the left panel
2. Click **+ Add flow**
3. Select **+ Create new flow**
4. Or import `ExcelUploaderFlow.json` from the PowerAutomateFlow folder
5. Name the flow connection in your app

## Step 5: Build the UI

### Header
1. Insert → **Rectangle**
   - Position: X=0, Y=0
   - Size: Width=Parent.Width, Height=80
   - Fill: `RGBA(0, 120, 212, 1)`

2. Insert → **Text label**
   - Text: `"Excel Uploader"`
   - Position: X=20, Y=20
   - Color: `White`
   - Size: 24
   - Font weight: Semibold

### File Upload Section
3. Insert → **Attachments** control
   - Position: X=40, Y=120
   - Size: Width=400, Height=100
   - MaxAttachments: `1`
   - Accept: `.xlsx`

4. Insert → **Button**
   - Text: `"Upload Excel"`
   - Position: X=40, Y=240
   - Fill: `RGBA(0, 120, 212, 1)`
   - OnSelect: Copy from `PowerFx_Formulas.txt` → UPLOAD BUTTON section

### Progress & Status
5. Insert → **Slider** (for progress bar)
   - Position: X=40, Y=300
   - Width: 400
   - Visible: `varUploading`
   - Value: `varProgress`
   - ShowValue: `false`

6. Insert → **Text label** (for status)
   - Text: `varStatusMessage`
   - Position: X=40, Y=340
   - Color: Formula from `PowerFx_Formulas.txt` → STATUS STYLING section

### Recent Uploads Gallery
7. Insert → **Vertical gallery**
   - Data source: `ExcelUploads`
   - Position: X=40, Y=400
   - Items: Formula from `PowerFx_Formulas.txt` → RECENT UPLOADS section
   - Add labels for Name, Date, Status

## Step 6: Configure App.OnStart

1. Click on the app name in the tree view
2. Select **OnStart** property
3. Paste the formula from `PowerFx_Formulas.txt` → APP ONSTART section

## Step 7: Test the App

1. Press **F5** or click **Preview** (play button)
2. Select an Excel file
3. Click Upload
4. Verify file appears in SharePoint library
5. Check the Power Automate flow ran successfully

## Step 8: Publish and Share

### Publish
1. Click **File** → **Save**
2. Click **Publish**
3. Confirm publish

### Share
1. Click **Share** in the top right
2. Add users or groups
3. Choose permission level:
   - **User**: Can use the app
   - **Co-owner**: Can edit and share

### Embed in SharePoint (Optional)
1. In Power Apps, click **...** on your app → **Details**
2. Copy the **Web link**
3. In SharePoint, edit a page
4. Add **Embed** web part
5. Paste the Power Apps link

### Embed in Teams (Optional)
1. In Teams, go to your channel
2. Click **+** to add a tab
3. Search for **Power Apps**
4. Select your Excel Uploader app

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Attachments control not showing | Ensure form is in Edit mode |
| Upload fails | Check SharePoint permissions |
| Flow not triggering | Verify flow connection in app |
| File not in library | Check library URL in data source |

## Customisation Options

### Add File Preview
- Use PDF Viewer control for previewing uploaded files

### Add Email Notifications
- Extend the Power Automate flow with email actions

### Add Approval Workflow
- Integrate with Power Automate approvals connector

### Mobile Optimisation
- Create a phone layout version
- Use responsive containers
