# SCL Data Automation Setup Guide

This document provides instructions for setting up the SCL Data Automation page with Google Sheets and SharePoint integration.

## Overview

The SCL Data Automation page has been created with the following features:
- **Three tabs**: Summary Tab, Outcome Indicators, Data Sources
- **Google Sheets integration**: Connects to "SCL Metadata 2025 - Staging Site"
- **Data processing**: Automatically duplicates rows with multiple sources
- **Export functionality**: Download data as CSV files
- **Real-time refresh**: Manual refresh button to sync latest data

## 🔧 Setup Instructions

### 1. Google Sheets API Setup

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Sheets API

#### Step 2: Create Service Account
1. Navigate to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Provide name: `scl-data-automation`
4. Assign role: `Viewer` or `Editor`
5. Click "Create and Download JSON Key"

#### Step 3: Share Spreadsheet with Service Account
1. Open the "SCL Metadata 2025 - Staging Site" spreadsheet
2. Click "Share" button
3. Add the service account email (from JSON key) with `Editor` access
4. The email looks like: `scl-data-automation@your-project.iam.gserviceaccount.com`

#### Step 4: Configure Environment Variables
Add these variables to your `.env.local` file:

```env
# Google Sheets API Configuration
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"
SCL_SPREADSHEET_ID=1JiOgcdwMm27IzFDhZlhEgHoT1nQqlcCrLXrPKtK08o

# SharePoint API Configuration (for future use)
SHAREPOINT_CLIENT_ID=your-azure-app-client-id
SHAREPOINT_CLIENT_SECRET=your-azure-app-client-secret
SHAREPOINT_TENANT_ID=your-azure-tenant-id
SHAREPOINT_SITE_ID=your-sharepoint-site-id
```

### 2. SharePoint API Setup

The SharePoint integration is now fully implemented! See [SHAREPOINT_SETUP.md](./SHAREPOINT_SETUP.md) for detailed setup instructions.

**Quick Overview:**
- Creates Azure App Registration with SharePoint permissions
- Connects to your organization's SharePoint site  
- Fetches data from individual Excel files in the Data collection folders
- Extracts "last updated date" and "last accessed date" from Notes sheets
- Displays this data in new blue columns in the Summary Tab

**Key Features:**
- ✅ "Check ID files" button for each indicator
- ✅ Automatic file location in Transport, Energy, Buildings, etc. subfolders
- ✅ Excel Notes sheet data extraction
- ✅ Error handling and user feedback
- ✅ Integration with existing authentication

#### Step 1: Register Azure AD Application
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Name: `SCL Data Automation`
5. Set redirect URI if needed

#### Step 2: Configure API Permissions
1. In the registered app, go to "API permissions"
2. Add Microsoft Graph permissions:
   - `Files.Read.All`
   - `Sites.Read.All`
   - `User.Read`
3. Grant admin consent

#### Step 3: Generate Client Secret
1. Under "Certificates & secrets"
2. Create new client secret
3. Copy the secret value immediately

## 📁 File Structure

```
src/
├── app/
│   ├── dashboard/
│   │   └── scl-data-automation/
│   │       └── page.tsx                 # Main SCL Data Automation page
│   └── api/
│       └── scl-automation/
│           ├── outcome-indicators/
│           │   └── route.ts             # API route for outcome indicators
│           └── data-sources/
│               └── route.ts             # API route for data sources
└── components/
    └── SideNav.tsx                      # Updated with new navigation item
```

## 🎯 Features Implemented

### Summary Tab
- **Data Processing**: Automatically duplicates rows where the "source" column contains multiple sources (comma-separated)
- **Enrichment**: Adds "source_url" and "last_updated_date" columns by matching sources with the Data Sources tab
- **Export**: Download processed data as CSV

### Outcome Indicators Tab
- **Direct Mirror**: Shows exact copy of "SCL Metadata 2025 > outcome indicators" tab
- **Real-time**: Refreshes data from Google Sheets on demand
- **Export**: Download raw outcome indicators data

### Data Sources Tab
- **Direct Mirror**: Shows exact copy of "SCL Metadata 2025 > data sources" tab
- **Links**: Clickable URLs for each data source
- **Export**: Download data sources information

## 🔍 Data Processing Logic

The Summary Tab implements the following transformations:

1. **Row Duplication**: 
   ```
   Original: source = "World Bank, IMF, OECD"
   Result: 3 separate rows, each with one source
   ```

2. **URL Matching**:
   ```
   For each individual source:
   - Find matching name in Data Sources tab
   - Copy corresponding URL to "source_url" column
   ```

3. **Date Matching**:
   ```
   For each individual source:
   - Find matching name in Data Sources tab  
   - Copy "last_updated" date to "last_updated_date" column
   ```

## 🚀 Usage

1. **Access**: Navigate to "SCL Data Automation" in the left sidebar
2. **Refresh**: Click "Refresh Data" to sync latest information
3. **Export**: Use "Export CSV" buttons in each tab to download data
4. **Monitor**: Check the stats cards for overview information

## 🔧 Troubleshooting

### Common Issues

1. **Authentication Error**:
   - Verify service account email is added to spreadsheet
   - Check GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in environment variables
   - Ensure Google Sheets API is enabled

2. **Permission Denied**:
   - Confirm service account has Editor access to spreadsheet
   - Verify spreadsheet ID is correct

3. **No Data Found**:
   - Check sheet names: "outcome indicators" and "data sources"
   - Verify data exists in specified ranges (A:T for indicators, A:G for sources)

4. **Missing Environment Variables**:
   - Ensure all required variables are set in `.env.local`
   - Restart the development server after adding variables

## 📊 Data Structure

### Outcome Indicators Expected Columns:
- id, shift, title, igntu, country_magnitude, target_direction
- acceleration_fac, status, chart_mi, chart_max, start_year, end_year
- source, last_accessed_date

### Data Sources Expected Columns:
- provider, name, url, description, last_updated

## 🔮 Future Enhancements

1. **SharePoint Integration**: Access Excel files from WRI SharePoint folder
2. **Automated Alerts**: Notify when data sources are updated
3. **Data Validation**: Check for inconsistencies and missing data
4. **Scheduling**: Automatic data refresh on schedule
5. **Advanced Analytics**: Trend analysis and reporting features

## 🆘 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify all environment variables are correctly set
3. Ensure Google Sheets permissions are properly configured
4. Contact the development team with specific error details
