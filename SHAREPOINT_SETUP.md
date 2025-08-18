# SharePoint Integration Setup Guide

This document provides step-by-step instructions for setting up SharePoint integration with the SCL Data Automation system to fetch data from individual Excel files.

## 🎯 Overview

The SharePoint integration allows the application to:
- Connect to your organization's SharePoint site
- Search for Excel files in specific folders (Transport, Energy, etc.)
- Extract "last updated date" and "last accessed date" from Notes sheets
- Display this data in the main SCL spreadsheet

## 🔧 Setup Instructions

### 1. Azure App Registration (Requires IT Admin)

⚠️ **Important**: As shown in your screenshot, your organization has disabled App registrations for regular users. You'll need to work with your IT administrator to set this up.

#### Option A: Request IT Admin to Create App Registration
**Send this request to your IT department:**

> **Subject**: Azure App Registration Request for SCL Data Automation SharePoint Integration
> 
> **Request**: Please create an Azure App Registration for our SCL Data Automation system to access SharePoint files.
> 
> **Details needed**:
> - **App Name**: `SCL Data Automation SharePoint`  
> - **Supported account types**: Accounts in this organizational directory only (WRI)
> - **API Permissions needed**:
>   - Microsoft Graph: `Sites.Read.All` (Read items in all site collections)
>   - Microsoft Graph: `Files.Read.All` (Read all files that user can access)  
>   - Microsoft Graph: `offline_access` (Maintain access to data)
> - **Permission Type**: Delegated permissions (not Application permissions)
> - **Admin Consent**: Required for the above permissions
> 
> **Purpose**: This will allow our data automation system to read Excel files from the "SCL External/06. Data/Main Working Folder/Data collection" SharePoint folder to extract publication dates and access dates for our sustainability indicators.
> 
> **Security**: The app only requests READ permissions and users must authenticate with their @wri.org accounts.

#### Option B: Use PowerShell (If IT Allows)
If your IT department prefers, they can create the app registration using PowerShell:

```powershell
# Connect to Azure AD
Connect-AzureAD

# Create the app registration
$app = New-AzureADApplication -DisplayName "SCL Data Automation SharePoint" -PublicClient $false

# Create a client secret
$secret = New-AzureADApplicationPasswordCredential -ObjectId $app.ObjectId -CustomKeyIdentifier "SCL SharePoint Key"

# Add Microsoft Graph permissions
$graphServicePrincipal = Get-AzureADServicePrincipal -Filter "AppId eq '00000003-0000-0000-c000-000000000000'"
$permissions = @(
    [Microsoft.Graph.PowerShell.Models.RequiredResourceAccess]@{
        ResourceAppId = "00000003-0000-0000-c000-000000000000"
        ResourceAccess = @(
            @{ Id = "205e70e5-aba6-4c52-a976-6d2d46c48043"; Type = "Scope" }, # Sites.Read.All
            @{ Id = "df021288-bdef-4463-88db-98f22de89214"; Type = "Scope" }, # Files.Read.All  
            @{ Id = "7427e0e9-2fba-42fe-b0c0-848c9e6a8182"; Type = "Scope" }  # offline_access
        )
    }
)
Set-AzureADApplication -ObjectId $app.ObjectId -RequiredResourceAccess $permissions

Write-Host "App ID: " $app.AppId
Write-Host "Client Secret: " $secret.Value
Write-Host "Tenant ID: " (Get-AzureADTenantDetail).ObjectId
```

#### Option C: Alternative Approach - Use Existing App (If Available)
If your organization already has a SharePoint app registration for similar purposes, you might be able to use that instead. Ask your IT team if there's an existing app with SharePoint read permissions that you can use.

#### What Your IT Admin Will Provide
Once the app registration is created, your IT admin should provide you with:
- **Application (Client) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Client Secret**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`  
- **Tenant ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

#### Step 2: Configure API Permissions (IT Admin Task)
1. In your app registration, go to "API permissions"
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. Choose "Delegated permissions"
5. Add these permissions:
   - `Sites.Read.All` - Read items in all site collections
   - `Files.Read.All` - Read all files that user can access
   - `offline_access` - Maintain access to data you have given it access to
6. Click "Add permissions"
7. **Important**: Click "Grant admin consent" for your organization

#### Step 3: Get Client Credentials
1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Add description: `SCL SharePoint Integration`
4. Set expiration as needed
5. Click "Add"
6. **Copy the secret value immediately** (you won't see it again)
7. Go to "Overview" and copy the "Application (client) ID"
8. Also copy the "Directory (tenant) ID"

### 2. Environment Variables Configuration

Add these variables to your Replit Secrets or `.env.local` file:

```env
# SharePoint Integration Configuration
AZURE_CLIENT_ID=your-application-client-id-from-step-3
AZURE_CLIENT_SECRET=your-client-secret-from-step-3  
AZURE_TENANT_ID=your-tenant-id-from-step-3

# SharePoint Site Configuration
SHAREPOINT_SITE_URL=https://onewri.sharepoint.com/sites/SystemsChangeLab
SHAREPOINT_DATA_PATH=/SCL External/06. Data/Main Working Folder/Data collection
```

### 3. NextAuth Configuration Update

The application needs to use your organization's Azure AD for authentication to access SharePoint.

#### Update your `authOptions` in `src/app/authOptions.ts`:

```typescript
import { NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      tenantId: process.env.AZURE_TENANT_ID!,
      authorization: {
        params: {
          scope: 'openid email profile https://graph.microsoft.com/Sites.Read.All https://graph.microsoft.com/Files.Read.All offline_access'
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    }
  }
};
```

### 4. SharePoint Folder Structure

Ensure your SharePoint folder structure matches:
```
SCL External Documents/
└── 06. Data/
    └── Main Working Folder/
        └── Data collection/
            ├── Transport/
            │   ├── TRNS-13.xlsx
            │   ├── TRNS-15.xlsx
            │   └── ...
            ├── Energy/
            │   ├── ENER-01.xlsx
            │   └── ...
            ├── Buildings/
            ├── Carbon Removal/
            ├── Circular Economy/
            ├── Cities/
            ├── Economics/
            ├── Finance/
            ├── Food and Agriculture/
            ├── Forests and Land/
            ├── Freshwater/
            ├── Governance/
            ├── Industry/
            └── Ocean/
```

### 5. Excel File Requirements

Each Excel file must have a "Notes" sheet with the following structure:

| Data source name | ... | last updated date | last accessed date (if no publication date) |
|------------------|-----|-------------------|---------------------------------------------|
| Source Name 1    | ... | 2024-01-15       | 2024-01-10                                  |
| Source Name 2    | ... | 2023-12-20       | 2023-12-15                                  |

**Requirements:**
- Sheet must be named "Notes"
- Must have a column containing source names (flexible matching)
- Must have columns with headers containing "last updated date" and "last accessed date"
- Source names should match the sources in your main SCL spreadsheet

## 🔐 Authentication Flow

1. User signs in with their `@wri.org` account
2. Azure AD provides an access token with SharePoint permissions
3. Application uses this token to access Microsoft Graph API
4. Graph API is used to read Excel files from SharePoint

## 🚀 Usage

1. **Access the SCL Data Automation page**
2. **Click "Check ID files" button** next to any indicator
3. **The system will**:
   - Extract the data file name (e.g., "TRNS-13.csv")
   - Normalize to indicator key (e.g., "TRNS-13") 
   - Search for "TRNS-13.xlsx" in SharePoint subfolders
   - Read the Notes sheet
   - Extract dates for the matching source
   - Display results in the new blue columns

## 🛠️ Troubleshooting

### Common Issues:

1. **"SharePoint authentication required"**
   - Make sure you're signed in with your @wri.org account
   - Check that Azure app permissions are granted

2. **"File not found in any subfolder"**
   - Verify the file exists in SharePoint
   - Check file naming convention (should be {INDICATOR}.xlsx)
   - Ensure it's in one of the expected subfolders

3. **"No matching source found in Notes sheet"**
   - Check that the source name in the Notes sheet matches the source in the main spreadsheet
   - Source name matching is flexible but should be close

4. **"Failed to read Notes sheet"**
   - Verify the Excel file has a sheet named "Notes"
   - Check that the required columns exist

### Testing Connection:

You can test the SharePoint connection by:
1. Going to `/api/scl-automation/fetch-indicator-data?indicatorKey=TRNS-13&sourceName=World Health Org`
2. This should return JSON with the fetched data or error details

## 📝 Security Notes

- The application only requests READ permissions to SharePoint
- Access is limited to your organization's tenant
- Users must authenticate with their organizational account
- No data is stored permanently - only displayed in the UI

## 🔄 Data Flow

```
1. User clicks "Check ID files"
   ↓
2. Extract indicator key from "data file" column
   ↓  
3. Search SharePoint folders for {key}.xlsx
   ↓
4. Open Excel file and read "Notes" sheet
   ↓
5. Find row matching the source name
   ↓
6. Extract "last updated date" and "last accessed date"
   ↓
7. Display in blue columns of main table
```

## 🔄 Temporary Development Workaround

While waiting for IT approval, you can still test the UI functionality:

1. **Mock Mode**: The "Check ID files" buttons will show appropriate error messages indicating authentication is required
2. **UI Testing**: You can see how the blue columns and loading states work
3. **Error Handling**: The system will gracefully handle the missing Azure app configuration

The full functionality will be available once the Azure app registration is set up by your IT team.

## 📧 Support

If you encounter issues:
1. **For Azure App Registration**: Contact your IT department with the request template above
2. **For technical issues**: Check the browser console for detailed error messages  
3. **For SharePoint access**: Verify you can access the SharePoint folders manually with your @wri.org account
4. **For file structure**: Ensure your Excel files have the "Notes" sheet with the required columns

### Who to Contact at WRI:
- **IT Department**: For Azure app registration and permissions
- **SharePoint Admin**: For folder access and file structure verification
- **System Administrator**: For any Azure AD configuration help

---

**Note**: This integration requires organizational Azure AD permissions and must be approved by your IT department. The development work is complete - only the Azure configuration remains.
