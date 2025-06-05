'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import GHGEmissionsSunburst from './GHGEmissionsSunburst';
import { EmissionNode } from '../lib/data/ghgEmissions';
import { ghgEmissionsData } from '../lib/data/ghgEmissions';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { addDocument, getDocuments, updateDocument, deleteDocument } from '../lib/firebase/firebaseUtils';
import { ThemedDropdown } from '../app/components/ThemedDropdown';
import { useTheme } from '../lib/contexts/ThemeContext';
import { saveAs } from 'file-saver';
import { useAuth } from '../lib/hooks/useAuth';
import Papa from 'papaparse';

// Interface for flattened table data
interface TableRow {
  [key: string]: string | number | undefined;
  id: string;
  location: string;
  sector: string;
  subsector: string;
  subSubsector: string;
  value: number;
}

// Add versioning state
interface ChartVersion {
  id: string;
  name: string;
  tableData: TableRow[];
  labelOverrides: { [key: string]: 'radial' | 'curved' };
  metadata?: Record<string, string>;
}

function generateVersionId() {
  return 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function SunburstChartTabs({ initialVersion }: { initialVersion?: ChartVersion }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const versionIdFromUrl = params?.versionId as string | undefined;

  const [activeTab, setActiveTab] = useState<'chart' | 'data' | 'metadata'>('chart');
  const [selectedLocation, setSelectedLocation] = useState<string>('WORLD');

  // Loading state for versions
  const [loading, setLoading] = useState(true);

  // Table data for the editable table (not used for chart rendering)
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [versionList, setVersionList] = useState<{ id: string; name: string }[]>([]);
  const [chartVersions, setChartVersions] = useState<ChartVersion[]>([]);
  const [activeVersionIdx, setActiveVersionIdx] = useState(0);

  const [isMounted, setIsMounted] = useState(false);

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const { currentTheme } = useTheme();

  const [metadata, setMetadata] = useState<Record<string, string>>({});

  const { user } = useAuth();

  const [currentVersion, setCurrentVersion] = useState<ChartVersion | null>(initialVersion || null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load chart state (metadata, tableData, labelOverrides) from localStorage or Firestore on mount and when currentVersion changes
  useEffect(() => {
    if (typeof window === 'undefined' || !currentVersion) return;
    const saveKey = `sunburstChart_${user?.uid || 'guest'}_${currentVersion.id || 'default'}`;
    const saved = localStorage.getItem(saveKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.metadata) setMetadata(parsed.metadata);
        if (parsed.tableData) setTableData(parsed.tableData);
        // Optionally restore labelOverrides if needed
        return;
      } catch (e) {
        // ignore
      }
    }
    // If not in localStorage, load from Firestore
    getDocuments('sunburstVersions').then((versionsRaw) => {
      const versions = versionsRaw as ChartVersion[];
      const found = versions.find(v => v.id === currentVersion.id);
      if (found && found.tableData) setTableData(found.tableData);
      if (found && found.metadata) setMetadata(found.metadata);
    });
  }, [user, currentVersion?.id]);

  useEffect(() => {
    if (!isMounted) return;
    setLoading(true);
    let hasRedirected = false;
    getDocuments('sunburstVersions').then((versionsRaw) => {
      const versions = versionsRaw as ChartVersion[];
      setVersionList(versions.map(v => ({ id: v.id, name: v.name })));
      setChartVersions(versions);
      setHasLoadedOnce(true);
      // Set active version index based on URL
      const idx = versions.findIndex((v: ChartVersion) => v.id === versionIdFromUrl);
      if (idx !== -1) {
        setActiveVersionIdx(idx);
        setTableData(versions[idx]?.tableData || []);
        // Set selectedLocation to WORLD if available, else first available, else ''
        const loadedTableData = versions[idx]?.tableData || [];
        const locations = Array.from(new Set(loadedTableData.map((row: TableRow) => row.location)));
        if (locations.includes('WORLD')) {
          setSelectedLocation('WORLD');
        } else if (locations.length > 0) {
          setSelectedLocation(locations[0]);
        } else {
          setSelectedLocation('');
        }
        setLoading(false);
      } else if (versions.length > 0 && !hasRedirected && versionIdFromUrl !== versions[0].id) {
        hasRedirected = true;
        // Only redirect if not already on the first version
        router.replace(`/dashboard/sunburst/${versions[0].id}`);
      } else if (versions.length === 0) {
        setActiveVersionIdx(-1);
        setTableData([]);
        setSelectedLocation('');
        setLoading(false);
      }
    });
  }, [versionIdFromUrl, isMounted]);

  // Get unique locations for the dropdown
  const availableLocations = useMemo(() => {
    const locationSet = new Set<string>();
    tableData.forEach(row => locationSet.add(row.location));
    const locations = Array.from(locationSet);
    return locations.sort();
  }, [tableData]);

  // Use the current in-memory tableData for the chart, not just the saved version
  const chartData = useMemo(() => {
    if (!tableData || !tableData.length) {
      return [];
    }
    const locationData = tableData.filter(row => row.location === selectedLocation);
    const hierarchy = rebuildHierarchicalData(locationData);
    console.log('locationData for', selectedLocation, locationData);
    console.log('hierarchy for', selectedLocation, hierarchy);
    return hierarchy;
  }, [tableData, selectedLocation]);

  // Function to rebuild hierarchical data from table data
  function rebuildHierarchicalData(tableRows: TableRow[]): EmissionNode[] {
    const sectors = new Map<string, EmissionNode>();

    tableRows.forEach((row: TableRow) => {
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

  // Debug log to confirm data at render time
  console.log('Rendering with tableData:', tableData);

  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');

  // Handler to duplicate the current chart version
  async function handleDuplicateVersion() {
    const base = chartVersions[activeVersionIdx];
    const newVersion = {
      name: `Copy of ${base.name}`,
      tableData: JSON.parse(JSON.stringify(base.tableData)),
      labelOverrides: { ...base.labelOverrides },
    };
    const docRef = await addDocument('sunburstVersions', newVersion);
    // Refetch versions
    getDocuments('sunburstVersions').then((versionsRaw) => {
      const versions = versionsRaw as ChartVersion[];
      setVersionList(versions.map(v => ({ id: v.id, name: v.name })));
      setChartVersions(versions);
      setActiveVersionIdx(versions.length - 1);
    });
  }

  // Handler to save a new version (after edit)
  const [isSaving, setIsSaving] = useState(false);
  async function finalizeSaveVersion() {
    setIsSaving(true);
    const newVersion = {
      name: newVersionName || `Version ${versionList.length + 1}`,
      tableData: JSON.parse(JSON.stringify(tableData)),
      labelOverrides: { ...localLabelOverrides },
    };
    const docRef = await addDocument('sunburstVersions', newVersion);

    // Poll Firestore for the new version to appear
    let attempts = 0;
    const maxAttempts = 5;
    const poll = async () => {
      const versionsRaw = await getDocuments('sunburstVersions');
      const versions = versionsRaw as ChartVersion[];
      setVersionList(versions.map(v => ({ id: v.id, name: v.name })));
      setChartVersions(versions);
      const newIdx = versions.findIndex(v => v.id === docRef.id);
      if (newIdx !== -1) {
        setActiveVersionIdx(newIdx);
        setTableData(versions[newIdx].tableData);
        setLocalLabelOverrides({}); // Clear after save
        setEditMode(false);
        router.push(`/dashboard/sunburst/${docRef.id}`);
        setShowSavePrompt(false);
        setNewVersionName('');
        setIsSaving(false);
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(poll, 300);
      } else {
        setIsSaving(false);
        alert('Failed to load new version. Please refresh the page.');
      }
    };
    poll();
  }

  // Handler to restore to default for the current version
  async function handleRestoreDefaults() {
    const base = chartVersions[activeVersionIdx];
    await updateDocument('sunburstVersions', base.id, { labelOverrides: {} });
    // Refetch versions
    getDocuments('sunburstVersions').then((versionsRaw) => {
      const versions = versionsRaw as ChartVersion[];
      setVersionList(versions.map(v => ({ id: v.id, name: v.name })));
      setChartVersions(versions);
    });
  }

  const [editMode, setEditMode] = useState(false);
  const [localLabelOverrides, setLocalLabelOverrides] = useState<{ [key: string]: 'radial' | 'curved' }>({});

  // When entering edit mode, initialize localLabelOverrides from current version
  const startEditMode = () => {
    setLocalLabelOverrides({ ...(initialVersion?.labelOverrides || {}) });
    setEditMode(true);
  };

  // When switching tabs or entering edit mode, initialize localLabelOverrides from current version
  useEffect(() => {
    if (editMode) {
      setLocalLabelOverrides({ ...(initialVersion?.labelOverrides || {}) });
    }
    // Do not reset localLabelOverrides on exiting edit mode
    // eslint-disable-next-line
  }, [activeVersionIdx, editMode]);

  // Save in place: update the current version's labelOverrides
  async function handleSaveInPlace() {
    const base = chartVersions[activeVersionIdx];
    await updateDocument('sunburstVersions', base.id, { labelOverrides: { ...localLabelOverrides } });
    // Refetch versions
    getDocuments('sunburstVersions').then((versionsRaw) => {
      const versions = versionsRaw as ChartVersion[];
      setVersionList(versions.map(v => ({ id: v.id, name: v.name })));
      setChartVersions(versions);
      // Find the new index of the just-saved version
      const newIdx = versions.findIndex(v => v.id === base.id);
      setActiveVersionIdx(newIdx);
      setTableData(versions[newIdx].tableData);
      setLocalLabelOverrides({}); // Clear after save
      setEditMode(false);
    });
  }

  // Save as new: prompt for version name and create a new version
  const handleSaveAsNew = () => {
    setShowSavePrompt(true);
  };

  // Delete a version by index (except Default)
  async function handleDeleteVersion(idx: number) {
    if (idx === 0) return; // Don't delete Default
    const id = chartVersions[idx].id;
    await deleteDocument('sunburstVersions', id);
    // Refetch versions
    getDocuments('sunburstVersions').then((versionsRaw) => {
      const versions = versionsRaw as ChartVersion[];
      setVersionList(versions.map(v => ({ id: v.id, name: v.name })));
      setChartVersions(versions);
      const newIdx = Math.max(0, idx - 1);
      setActiveVersionIdx(newIdx);
      router.push(`/dashboard/sunburst/${versions[newIdx].id}`);
    });
  }

  // When switching tabs, update the URL
  function handleTabSwitch(idx: number) {
    setActiveVersionIdx(idx);
    router.push(`/dashboard/sunburst/${chartVersions[idx].id}`);
  }

  // Debug logs
  console.log('tableData:', tableData);
  console.log('availableLocations:', availableLocations);
  console.log('selectedLocation:', selectedLocation);
  console.log('Chart labelOverrides:', editMode ? localLabelOverrides : initialVersion?.labelOverrides);

  // Helper to extract all unique section names from chartData
  function extractSectionNames(nodes: EmissionNode[], parentNames: string[] = []): string[] {
    let names: string[] = [];
    nodes.forEach(node => {
      const fullName = [...parentNames, node.name].join(' | ');
      names.push(fullName);
      if (node.children) {
        names = names.concat(extractSectionNames(node.children, [...parentNames, node.name]));
      }
    });
    return names;
  }
  const sectionNames = useMemo(() => extractSectionNames(chartData), [chartData]);

  // Helper to download metadata as CSV
  function downloadMetadataCSV() {
    const rows = [['Section', 'Information']].concat(
      sectionNames.map(name => [name, metadata[name] || ''])
    );
    const csv = rows.map(row => row.map(cell => '"' + (cell || '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'metadata.csv');
  }

  // Helper to download data table as CSV
  function downloadDataTableCSV() {
    if (!tableData.length) return;
    const headers = Object.keys(tableData[0]);
    const rows = [headers].concat(tableData.map(row => headers.map(h => String(row[h] ?? ''))));
    const csv = rows.map(row => row.map(cell => '"' + cell.replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'data-table.csv');
  }

  // Helper to handle CSV upload
  function handleDataTableUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (Array.isArray(results.data)) {
          // Flexible header mapping
          const headerMap: Record<string, string> = {};
          if (results.meta && Array.isArray(results.meta.fields)) {
            results.meta.fields.forEach((header: string) => {
              const normalized = header
                .toLowerCase()
                .replace(/\s+/g, '')
                .replace(/_/g, '');
              if (normalized === 'location') headerMap[header] = 'location';
              else if (normalized === 'sector') headerMap[header] = 'sector';
              else if (normalized === 'subsector') headerMap[header] = 'subsector';
              else if (normalized === 'subsubsector' || normalized === 'subsubsecto') headerMap[header] = 'subSubsector';
              else if (normalized === 'id') headerMap[header] = 'id';
              else if (normalized === 'value') headerMap[header] = 'value';
              else headerMap[header] = header; // fallback: keep as is
            });
          }
          const normalized = results.data.map((row: any, idx: number) => {
            const newRow: any = {};
            for (const key in row) {
              if (!row.hasOwnProperty(key)) continue;
              const mappedKey = headerMap[key] || key;
              let value = row[key];
              if (typeof value === 'string') {
                value = value.trim();
              }
              newRow[mappedKey] = value;
            }
            // Ensure all required fields exist
            newRow['id'] = newRow['id'] || `row_${idx}`;
            newRow['location'] = (typeof newRow['location'] === 'string' ? newRow['location'].trim() : '');
            newRow['sector'] = newRow['sector'] || '';
            newRow['subsector'] = newRow['subsector'] || '';
            newRow['subSubsector'] = newRow['subSubsector'] || '';
            // Convert value to number
            const rawValue = newRow['value'];
            newRow['value'] = typeof rawValue === 'number' ? rawValue : Number(String(rawValue).replace(/,/g, '').trim()) || 0;
            return newRow;
          });
          setTableData(normalized as TableRow[]);
        }
      },
    });
  }

  // Add a new empty row
  function addDataTableRow() {
    if (!tableData.length) return;
    const headers = Object.keys(tableData[0]);
    const newRow: TableRow = {
      id: `row_${tableData.length}`,
      location: '',
      sector: '',
      subsector: '',
      subSubsector: '',
      value: 0,
    };
    headers.forEach(h => { if (!(h in newRow)) newRow[h] = ''; });
    setTableData([...tableData, newRow]);
  }

  // Save all chart state to localStorage and Firebase
  async function handleSaveAll() {
    const saveKey = `sunburstChart_${user?.uid || 'guest'}_${currentVersion?.id || 'default'}`;
    const saveData = {
      metadata,
      tableData,
      labelOverrides: editMode ? localLabelOverrides : currentVersion?.labelOverrides || {},
    };
    // Save to localStorage
    try {
      localStorage.setItem(saveKey, JSON.stringify(saveData));
    } catch (e) {
      alert('Failed to save to localStorage.');
    }
    // Save to Firebase if user and version
    if (user && currentVersion?.id) {
      try {
        await updateDocument('sunburstVersions', currentVersion.id, saveData);
        alert('Changes saved to cloud and localStorage!');
      } catch (e) {
        alert('Failed to save to Firebase.');
      }
    } else {
      alert('Changes saved to localStorage!');
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.tableData = tableData;
    }
  }, [tableData]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div
      className="bg-white rounded-lg shadow-lg"
      style={{ fontFamily: currentTheme.typography.fontFamily.primary }}
    >
      <div className="flex justify-end p-4">
        <button
          className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition"
          onClick={handleSaveAll}
        >
          Save Changes
        </button>
      </div>
      {/* Module Title and Duplicate Icon */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Sunburst Chart</h2>
          <button
            className="ml-2 text-gray-500 hover:text-blue-600"
            title="Duplicate chart"
            onClick={handleDuplicateVersion}
          >
            {/* Duplicate Icon (Squares) */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" /><rect x="3" y="3" width="13" height="13" rx="2" /></svg>
          </button>
        </div>
        {/* Version Tabs */}
        <div className="flex gap-2">
          {chartVersions.map((v, idx) => (
            <div key={v.id} className="flex items-center">
              <button
                className={`px-3 py-1 rounded ${idx === activeVersionIdx ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                onClick={() => handleTabSwitch(idx)}
              >
                {v.name}
              </button>
              {idx !== 0 && (
                <button
                  className="ml-1 text-xs text-red-500 hover:text-red-700"
                  title="Delete this version"
                  onClick={() => handleDeleteVersion(idx)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          <button
            onClick={() => setActiveTab('chart')}
            className={`w-1/3 py-4 px-6 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'chart' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Chart Visualization
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`w-1/3 py-4 px-6 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'data' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Data Table
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`w-1/3 py-4 px-6 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'metadata' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Metadata
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'chart' && (
          <div>
            {/* Title */}
            <div className="mb-2">
              <h2
                className="text-2xl font-bold"
                style={{
                  color: currentTheme.colors.text,
                  fontFamily: currentTheme.typography.fontFamily.primary,
                  fontSize: currentTheme.typography.fontSize['2xl'],
                  fontWeight: currentTheme.typography.fontWeight.bold,
                  letterSpacing: '0.01em',
                  lineHeight: 1.2,
                }}
              >
                Global/National GHG Emissions by Sector
              </h2>
            </div>
            {/* Location Filter */}
            <div className="mb-6 flex items-center gap-4">
              <label htmlFor="location-select" className="text-sm font-medium text-gray-700">
                Location:
              </label>
              <div className="flex-1 min-w-[180px]">
                <ThemedDropdown
                  label={undefined}
                  options={availableLocations.length === 0 ? [{ value: '', label: 'No locations', disabled: true }] : availableLocations.map(loc => ({ value: loc, label: loc }))}
                  value={selectedLocation}
                  onChange={setSelectedLocation}
                  minWidth="180px"
                />
              </div>
            </div>

            {/* Chart */}
            <div className="relative w-full">
              {/* Edit controls */}
              <div className="flex w-full justify-end p-2 gap-2">
                {!editMode ? (
                  <button
                    className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-blue-600"
                    onClick={startEditMode}
                    title="Edit chart labels"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.1 2.1 0 1 1 2.97 2.97L7.5 18.79l-4 1 1-4 14.362-14.303z" /></svg>
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      className="flex items-center gap-1 px-2 py-1 text-sm text-green-600 hover:text-green-800"
                      onClick={handleSaveInPlace}
                      title="Save changes to this version"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      Save
                    </button>
                    <button
                      className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:text-blue-800"
                      onClick={handleSaveAsNew}
                      title="Save as new version"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 12h8M12 8v8" /></svg>
                      Save as New
                    </button>
                    {/* Restore Defaults Button */}
                    {Object.keys(initialVersion?.labelOverrides || {}).length > 0 && (
                      <button
                        className="flex items-center gap-1 px-2 py-1 text-sm text-yellow-600 hover:text-yellow-800"
                        onClick={handleRestoreDefaults}
                        title="Restore default chart (remove all label edits)"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        Restore Defaults
                      </button>
                    )}
                    <button
                      className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-red-600"
                      onClick={() => { setEditMode(false); setLocalLabelOverrides({}); }}
                      title="Cancel edit mode"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      Cancel
                    </button>
                  </>
                )}
              </div>
              <div className="overflow-x-auto max-w-full">
                {activeVersionIdx !== -1 && initialVersion ? (
                  <GHGEmissionsSunburst
                    key={initialVersion.id + '-' + (editMode ? 'edit' : 'view') + '-' + JSON.stringify(editMode ? localLabelOverrides : initialVersion.labelOverrides)}
                    data={chartData}
                    labelOverrides={editMode ? localLabelOverrides : initialVersion.labelOverrides}
                    editMode={editMode}
                    onLabelOverridesChange={editMode ? setLocalLabelOverrides : undefined}
                    metadata={metadata}
                  />
                ) : (
                  !loading && <div className="text-center text-red-500">Chart version not found or not loaded.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="overflow-x-auto">
            <div className="flex justify-end mb-2 gap-2">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
                onClick={downloadDataTableCSV}
              >
                Download CSV
              </button>
              <label className="bg-gray-200 text-gray-700 px-4 py-2 rounded shadow cursor-pointer hover:bg-gray-300 transition">
                Upload CSV
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleDataTableUpload}
                />
              </label>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {tableData.length > 0 && Object.keys(tableData[0]).map((header) => (
                    <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableData.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {Object.keys(row).map((col, colIdx) => (
                      <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <input
                          className="w-full border px-2 py-1 rounded"
                          value={row[col] ?? ''}
                          onChange={e => {
                            const newTable = [...tableData];
                            newTable[rowIdx] = { ...newTable[rowIdx], [col]: e.target.value };
                            setTableData(newTable);
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-2">
              <button
                className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition"
                onClick={addDataTableRow}
              >
                Add Row
              </button>
            </div>
          </div>
        )}

        {activeTab === 'metadata' && (
          <div className="overflow-x-auto">
            <div className="flex justify-end mb-2">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
                onClick={downloadMetadataCSV}
              >
                Download CSV
              </button>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Information</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sectionNames.map((name, idx) => (
                  <tr key={name}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <textarea
                        className="w-full border px-2 py-1 rounded"
                        value={metadata[name] || ''}
                        onChange={e => setMetadata(m => ({ ...m, [name]: e.target.value }))}
                        rows={2}
                        onPaste={idx === 0 ? (e => {
                          const text = e.clipboardData.getData('text');
                          if (text.includes('\n')) {
                            e.preventDefault();
                            const lines = text.replace(/\r/g, '').split('\n');
                            setMetadata(m => {
                              const updated = { ...m };
                              for (let i = 0; i < lines.length && i < sectionNames.length; i++) {
                                updated[sectionNames[i]] = lines[i];
                              }
                              return updated;
                            });
                          }
                        }) : undefined}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Save Version Prompt Modal */}
        {showSavePrompt && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-96">
              <h3 className="text-lg font-bold mb-2">Save Chart Version</h3>
              <input
                className="w-full border px-3 py-2 rounded mb-4"
                placeholder="Version name"
                value={newVersionName}
                onChange={e => setNewVersionName(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button className="px-3 py-1 rounded bg-gray-200" onClick={() => setShowSavePrompt(false)}>Cancel</button>
                <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={finalizeSaveVersion} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 