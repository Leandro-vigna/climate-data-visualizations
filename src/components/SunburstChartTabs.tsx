'use client';

import { useState, useCallback, useMemo } from 'react';
import GHGEmissionsSunburst from './GHGEmissionsSunburst';
import { EmissionNode } from '../lib/data/ghgEmissions';
import { ghgEmissionsData } from '../lib/data/ghgEmissions';

// Interface for flattened table data
interface TableRow {
  id: string;
  location: string;
  sector: string;
  subsector: string;
  subSubsector: string;
  value: number;
}

export default function SunburstChartTabs() {
  const [activeTab, setActiveTab] = useState<'chart' | 'data'>('chart');
  const [selectedLocation, setSelectedLocation] = useState<string>('WORLD');
  const [tableData, setTableData] = useState<TableRow[]>(() => {
    // Flatten the hierarchical data into table format
    const flattened: TableRow[] = [];
    
    ghgEmissionsData.forEach(sector => {
      // Add sector row
      flattened.push({
        id: `sector-${sector.id}`,
        location: 'WORLD',
        sector: sector.name,
        subsector: '',
        subSubsector: '',
        value: sector.share
      });

      // Add subsector rows
      if (sector.children) {
        sector.children.forEach(subsector => {
          flattened.push({
            id: `subsector-${subsector.id}`,
            location: 'WORLD',
            sector: sector.name,
            subsector: subsector.name,
            subSubsector: '',
            value: subsector.share
          });

          // Add sub-subsector rows
          if (subsector.children) {
            subsector.children.forEach(subSubsector => {
              flattened.push({
                id: `subsubsector-${subSubsector.id}`,
                location: 'WORLD',
                sector: sector.name,
                subsector: subsector.name,
                subSubsector: subSubsector.name,
                value: subSubsector.share
              });
            });
          }
        });
      }
    });

    return flattened;
  });

  // Get unique locations for the dropdown
  const availableLocations = useMemo(() => {
    const locationSet = new Set<string>();
    tableData.forEach(row => locationSet.add(row.location));
    const locations = Array.from(locationSet);
    return locations.sort();
  }, [tableData]);

  // Filter data by selected location and convert to chart format
  const chartData = useMemo(() => {
    const locationData = tableData.filter(row => row.location === selectedLocation);
    return rebuildHierarchicalData(locationData);
  }, [tableData, selectedLocation]);

  // Function to rebuild hierarchical data from table data
  function rebuildHierarchicalData(tableRows: TableRow[]): EmissionNode[] {
    const sectors = new Map<string, EmissionNode>();

    tableRows.forEach(row => {
      // Create or get sector
      if (!sectors.has(row.sector)) {
        sectors.set(row.sector, {
          id: row.sector.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: row.sector,
          share: 0,
          children: []
        });
      }
      const sectorNode = sectors.get(row.sector)!;

      // If this is a sector-level row
      if (!row.subsector && !row.subSubsector) {
        sectorNode.share = row.value;
        return;
      }

      // If this is a subsector-level row
      if (row.subsector && !row.subSubsector) {
        let subsectorNode = sectorNode.children!.find(child => child.name === row.subsector);
        if (!subsectorNode) {
          subsectorNode = {
            id: row.subsector.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            name: row.subsector,
            share: row.value,
            children: []
          };
          sectorNode.children!.push(subsectorNode);
        } else {
          subsectorNode.share = row.value;
        }
        return;
      }

      // If this is a sub-subsector-level row
      if (row.subsector && row.subSubsector) {
        let subsectorNode = sectorNode.children!.find(child => child.name === row.subsector);
        if (!subsectorNode) {
          subsectorNode = {
            id: row.subsector.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            name: row.subsector,
            share: 0,
            children: []
          };
          sectorNode.children!.push(subsectorNode);
        }

        subsectorNode.children!.push({
          id: row.subSubsector.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: row.subSubsector,
          share: row.value
        });
      }
    });

    return Array.from(sectors.values());
  }

  // Handle value changes in the table
  const handleValueChange = useCallback((rowId: string, newValue: number) => {
    const updatedTableData = tableData.map(row => 
      row.id === rowId ? { ...row, value: newValue } : row
    );
    
    setTableData(updatedTableData);
  }, [tableData]);

  // Handle location changes in the table
  const handleLocationChange = useCallback((rowId: string, newLocation: string) => {
    const updatedTableData = tableData.map(row => 
      row.id === rowId ? { ...row, location: newLocation } : row
    );
    
    setTableData(updatedTableData);
  }, [tableData]);

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          <button
            onClick={() => setActiveTab('chart')}
            className={`w-1/2 py-4 px-6 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'chart'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Chart Visualization
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`w-1/2 py-4 px-6 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'data'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Data Table
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'chart' && (
          <div>
            {/* Location Filter */}
            <div className="mb-6 flex items-center gap-4">
              <label htmlFor="location-select" className="text-sm font-medium text-gray-700">
                Location:
              </label>
              <select
                id="location-select"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableLocations.map(location => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            {/* Chart */}
            <GHGEmissionsSunburst data={chartData} />
          </div>
        )}

        {activeTab === 'data' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sector
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subsector
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sub-subsector
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value (%)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <input
                        type="text"
                        value={row.location}
                        onChange={(e) => handleLocationChange(row.id, e.target.value)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.sector}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.subsector}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.subSubsector}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={row.value}
                        onChange={(e) => handleValueChange(row.id, parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 