"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDocuments, addDocument } from "../../../lib/firebase/firebaseUtils";

// Default seed data for a new version
const defaultTableData = [
  { id: "1", location: "WORLD", sector: "Energy", subsector: "", subSubsector: "", value: 73.2 },
  { id: "2", location: "WORLD", sector: "Energy", subsector: "Electricity/Heat", subSubsector: "", value: 24.2 },
  { id: "3", location: "WORLD", sector: "Energy", subsector: "Transport", subSubsector: "", value: 16.2 },
  { id: "4", location: "WORLD", sector: "Energy", subsector: "Other Fuel Combustion", subSubsector: "", value: 10.6 },
  { id: "5", location: "WORLD", sector: "Agriculture", subsector: "", subSubsector: "", value: 18.4 },
  { id: "6", location: "WORLD", sector: "Agriculture", subsector: "Livestock & Manure", subSubsector: "", value: 5.8 },
  { id: "7", location: "WORLD", sector: "Agriculture", subsector: "Rice Cultivation", subSubsector: "", value: 1.3 },
  { id: "8", location: "WORLD", sector: "Industry", subsector: "", subSubsector: "", value: 5.2 },
  { id: "9", location: "WORLD", sector: "Waste", subsector: "", subSubsector: "", value: 3.2 }
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