'use client';

import { useEffect } from "react";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { app } from "../../../lib/firebase/firebase"; // Adjust path if needed

const sampleTableData = [
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

export default function SeedDataPage() {
  useEffect(() => {
    async function seed() {
      const db = getFirestore(app);
      const ref = doc(db, "sunburstVersions", "default");
      await updateDoc(ref, { tableData: sampleTableData });
      alert("Sample data added to Firestore!");
    }
    seed();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-64">
      <h1 className="text-xl font-bold mb-4">Seeding Firestore...</h1>
      <p>Check your Firestore after you see the alert.</p>
    </div>
  );
}