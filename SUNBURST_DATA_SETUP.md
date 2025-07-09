# Sunburst Chart Default Data Setup

## Overview

The Sunburst Chart now includes comprehensive default data for **WORLD + 3 countries (USA, China, India)** that is automatically stored in Firebase for all users.

## Data Structure

The default dataset includes:

### WORLD Data
- Energy: 73.2%
- Agriculture: 18.4%
- Industry: 5.2%
- Waste: 3.2%

### USA Data
- Energy: 82.1%
- Agriculture: 8.2%
- Industry: 6.8%
- Waste: 2.9%

### China Data
- Energy: 85.3%
- Agriculture: 7.8%
- Industry: 4.9%
- Waste: 2.0%

### India Data
- Energy: 68.9%
- Agriculture: 22.1%
- Industry: 6.5%
- Waste: 2.5%

## Implementation Details

### Files Modified

1. **`src/app/dashboard/sunburst/page.tsx`**
   - Updated `defaultTableData` to include WORLD + 3 countries
   - Added call to `ensureDefaultSunburstData()` function

2. **`src/lib/firebase/firebaseUtils.ts`**
   - Added `ensureDefaultSunburstData()` function
   - Added comprehensive default data array
   - Function checks if data exists and creates/updates as needed

3. **`src/app/dashboard/sunburst/seed-data.tsx`**
   - Updated to use the new `ensureDefaultSunburstData()` function
   - Provides better user feedback

4. **`src/app/api/sunburst/ensure-default/route.ts`**
   - New API endpoint for manual data setup
   - Can be called via GET or POST requests

### How It Works

1. **Automatic Setup**: When users visit `/dashboard/sunburst`, the system automatically ensures the default data is available in Firebase.

2. **Data Persistence**: The data is stored in the `sunburstVersions` collection in Firebase with the following structure:
   ```typescript
   {
     id: string,
     name: string,
     tableData: TableRow[],
     labelOverrides: object,
     metadata?: object
   }
   ```

3. **Location Filtering**: Users can switch between different locations (WORLD, USA, China, India) using the dropdown in the chart interface.

4. **Data Structure**: Each row in the table data follows this structure:
   ```typescript
   {
     id: string,
     location: string,
     sector: string,
     subsector: string,
     subSubsector: string,
     value: number
   }
   ```

## Usage

### For New Users
- Simply visit `/dashboard/sunburst` and the default data will be automatically created
- The system will redirect to the first available version

### For Existing Users
- If existing users have only WORLD data, the system will automatically update their first version to include all countries
- If they already have comprehensive data, no changes will be made

### Manual Setup
- Visit `/dashboard/sunburst/seed-data` to manually trigger the data setup
- Call the API endpoint `/api/sunburst/ensure-default` to programmatically ensure data exists

## API Endpoints

### GET/POST `/api/sunburst/ensure-default`
- Ensures default sunburst data is available in Firebase
- Returns success status and whether data was updated
- Useful for manual setup or testing

## Data Sources

The emission data is based on typical greenhouse gas emission patterns for these countries, with realistic sectoral breakdowns that reflect:

- **USA**: Higher energy consumption, lower agriculture
- **China**: Very high energy consumption, moderate agriculture
- **India**: Moderate energy, higher agriculture (especially rice cultivation)
- **WORLD**: Global averages across all sectors

## Future Enhancements

- Add more countries
- Include historical data
- Add more detailed subsector breakdowns
- Include metadata for each country/sector 