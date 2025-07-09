"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDocuments, addDocument, ensureDefaultSunburstData } from "../../../lib/firebase/firebaseUtils";

// Default seed data for a new version - includes WORLD + 3 countries
const defaultTableData = [
  // WORLD data
  { id: "1", location: "WORLD", sector: "Energy", subsector: "", subSubsector: "", value: 73.2 },
  { id: "2", location: "WORLD", sector: "Energy", subsector: "Electricity/Heat", subSubsector: "", value: 24.2 },
  { id: "3", location: "WORLD", sector: "Energy", subsector: "Transport", subSubsector: "", value: 16.2 },
  { id: "4", location: "WORLD", sector: "Energy", subsector: "Other Fuel Combustion", subSubsector: "", value: 10.6 },
  { id: "5", location: "WORLD", sector: "Agriculture", subsector: "", subSubsector: "", value: 18.4 },
  { id: "6", location: "WORLD", sector: "Agriculture", subsector: "Livestock & Manure", subSubsector: "", value: 5.8 },
  { id: "7", location: "WORLD", sector: "Agriculture", subsector: "Rice Cultivation", subSubsector: "", value: 1.3 },
  { id: "8", location: "WORLD", sector: "Industry", subsector: "", subSubsector: "", value: 5.2 },
  { id: "9", location: "WORLD", sector: "Waste", subsector: "", subSubsector: "", value: 3.2 },
  
  // USA data
  { id: "10", location: "USA", sector: "Energy", subsector: "", subSubsector: "", value: 82.1 },
  { id: "11", location: "USA", sector: "Energy", subsector: "Electricity/Heat", subSubsector: "", value: 31.5 },
  { id: "12", location: "USA", sector: "Energy", subsector: "Transport", subSubsector: "", value: 28.9 },
  { id: "13", location: "USA", sector: "Energy", subsector: "Other Fuel Combustion", subSubsector: "", value: 12.3 },
  { id: "14", location: "USA", sector: "Agriculture", subsector: "", subSubsector: "", value: 8.2 },
  { id: "15", location: "USA", sector: "Agriculture", subsector: "Livestock & Manure", subSubsector: "", value: 3.1 },
  { id: "16", location: "USA", sector: "Agriculture", subsector: "Rice Cultivation", subSubsector: "", value: 0.2 },
  { id: "17", location: "USA", sector: "Industry", subsector: "", subSubsector: "", value: 6.8 },
  { id: "18", location: "USA", sector: "Waste", subsector: "", subSubsector: "", value: 2.9 },
  
  // China data
  { id: "19", location: "China", sector: "Energy", subsector: "", subSubsector: "", value: 85.3 },
  { id: "20", location: "China", sector: "Energy", subsector: "Electricity/Heat", subSubsector: "", value: 42.7 },
  { id: "21", location: "China", sector: "Energy", subsector: "Transport", subSubsector: "", value: 18.6 },
  { id: "22", location: "China", sector: "Energy", subsector: "Other Fuel Combustion", subSubsector: "", value: 15.2 },
  { id: "23", location: "China", sector: "Agriculture", subsector: "", subSubsector: "", value: 7.8 },
  { id: "24", location: "China", sector: "Agriculture", subsector: "Livestock & Manure", subSubsector: "", value: 2.9 },
  { id: "25", location: "China", sector: "Agriculture", subsector: "Rice Cultivation", subSubsector: "", value: 2.1 },
  { id: "26", location: "China", sector: "Industry", subsector: "", subSubsector: "", value: 4.9 },
  { id: "27", location: "China", sector: "Waste", subsector: "", subSubsector: "", value: 2.0 },
  
  // India data
  { id: "28", location: "India", sector: "Energy", subsector: "", subSubsector: "", value: 68.9 },
  { id: "29", location: "India", sector: "Energy", subsector: "Electricity/Heat", subSubsector: "", value: 28.4 },
  { id: "30", location: "India", sector: "Energy", subsector: "Transport", subSubsector: "", value: 15.7 },
  { id: "31", location: "India", sector: "Energy", subsector: "Other Fuel Combustion", subSubsector: "", value: 12.8 },
  { id: "32", location: "India", sector: "Agriculture", subsector: "", subSubsector: "", value: 22.1 },
  { id: "33", location: "India", sector: "Agriculture", subsector: "Livestock & Manure", subSubsector: "", value: 8.9 },
  { id: "34", location: "India", sector: "Agriculture", subsector: "Rice Cultivation", subSubsector: "", value: 6.2 },
  { id: "35", location: "India", sector: "Industry", subsector: "", subSubsector: "", value: 6.5 },
  { id: "36", location: "India", sector: "Waste", subsector: "", subSubsector: "", value: 2.5 }
];

export default function SunburstRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function ensureVersionAndRedirect() {
      // Check if we are already on a version page
      if (window.location.pathname.includes('/dashboard/sunburst/')) {
        return;
      }
      
      // Ensure default data is available in Firebase
      await ensureDefaultSunburstData();
      
      const versions = await getDocuments('sunburstVersions');
      if (cancelled) return;
      if (versions.length > 0) {
        router.replace(`/dashboard/sunburst/${versions[0].id}`);
      } else {
        // Create a default version
        const docRef = await addDocument('sunburstVersions', {
          name: 'Default',
          tableData: defaultTableData,
          labelOverrides: {}
        });
        if (cancelled) return;
        router.replace(`/dashboard/sunburst/${docRef.id}`);
      }
    }
    ensureVersionAndRedirect();
    return () => { cancelled = true; };
  }, [router]);

  return <div>Redirecting...</div>;
} 