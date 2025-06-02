export interface EmissionNode {
  id: string;
  name: string;
  share: number;
  children?: EmissionNode[];
}

// Helper function to create a unique ID for each node
function createNodeId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

// Transform flat data into hierarchical structure
function transformData(data: Array<[string, string, string, number]>): EmissionNode[] {
  const sectors = new Map<string, EmissionNode>();
  
  data.forEach(([sector, subsector, subsubsector, share]) => {
    // Create or get sector
    if (!sectors.has(sector)) {
      sectors.set(sector, {
        id: createNodeId(sector),
        name: sector,
        share: 0,
        children: []
      });
    }
    const sectorNode = sectors.get(sector)!;

    // If only sector data
    if (!subsector) {
      sectorNode.share = share;
      return;
    }

    // Find or create subsector
    let subsectorNode = sectorNode.children!.find(child => child.name === subsector);
    if (!subsectorNode) {
      subsectorNode = {
        id: createNodeId(subsector),
        name: subsector,
        share: 0,
        children: []
      };
      sectorNode.children!.push(subsectorNode);
    }

    // If only subsector data
    if (!subsubsector) {
      subsectorNode.share = share;
      return;
    }

    // Create sub-subsector
    subsectorNode.children!.push({
      id: createNodeId(subsubsector),
      name: subsubsector,
      share
    });
  });

  return Array.from(sectors.values());
}

// Raw data from the Excel sheet
const rawData: Array<[string, string, string, number]> = [
  ["Energy", "", "", 73.2],
  ["Energy", "Energy use in Industry", "", 24.2],
  ["Energy", "Energy use in Industry", "Iron and steel", 7.2],
  ["Energy", "Energy use in Industry", "Non-ferrous metals", 0.7],
  ["Energy", "Energy use in Industry", "Chemical & petrochemical", 3.6],
  ["Energy", "Energy use in Industry", "Food & tobacco", 1.0],
  ["Energy", "Energy use in Industry", "Paper & pulp", 0.6],
  ["Energy", "Energy use in Industry", "Machinery", 0.5],
  ["Energy", "Energy use in Industry", "Other industry", 10.6],
  ["Energy", "Transport", "", 16.2],
  ["Energy", "Transport", "Road Transport", 11.9],
  ["Energy", "Transport", "Aviation", 1.4],
  ["Energy", "Transport", "Shipping", 2.7],
  ["Energy", "Transport", "Rail", 0.4],
  ["Energy", "Transport", "Pipeline", 0.3],
  ["Energy", "Energy use in buildings", "", 17.5],
  ["Energy", "Energy use in buildings", "Residential buildings", 10.9],
  ["Energy", "Energy use in buildings", "Commercial", 6.6],
  ["Energy", "Unallocated fuel combustion", "", 7.8],
  ["Energy", "Fugitive emissions from energy production", "", 5.8],
  ["Energy", "Energy in Agriculture & Fishing", "", 1.7],
  ["Agriculture, Forestry & Land Use", "", "", 18.4],
  ["Agriculture, Forestry & Land Use", "Livestock & manure", "", 5.8],
  ["Agriculture, Forestry & Land Use", "Agricultural soils", "", 4.1],
  ["Agriculture, Forestry & Land Use", "Rice cultivation", "", 1.3],
  ["Agriculture, Forestry & Land Use", "Crop burning", "", 3.5],
  ["Agriculture, Forestry & Land Use", "Deforestation", "", 2.2],
  ["Agriculture, Forestry & Land Use", "Cropland", "", 1.4],
  ["Agriculture, Forestry & Land Use", "Grassland", "", 0.1],
  ["Industry", "", "", 5.2],
  ["Industry", "Cement", "", 3],
  ["Industry", "Chemicals", "", 2.2],
  ["Waste", "", "", 3.2],
  ["Waste", "Landfills", "", 1.9],
  ["Waste", "Wastewater", "", 1.3]
];

export const ghgEmissionsData: EmissionNode[] = transformData(rawData); 