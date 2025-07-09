'use client';

import { useEffect } from "react";
import { ensureDefaultSunburstData } from "../../../lib/firebase/firebaseUtils";

export default function SeedDataPage() {
  useEffect(() => {
    async function seed() {
      try {
        const result = await ensureDefaultSunburstData();
        if (result) {
          alert("Default sunburst data (WORLD + 3 countries) has been created/updated in Firebase!");
        } else {
          alert("Default sunburst data already exists in Firebase!");
        }
      } catch (error) {
        console.error('Error seeding data:', error);
        alert("Error seeding data. Check console for details.");
      }
    }
    seed();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-64">
      <h1 className="text-xl font-bold mb-4">Seeding Firestore...</h1>
      <p>Setting up default sunburst data with WORLD + USA + China + India</p>
      <p className="text-sm text-gray-600 mt-2">Check your Firestore after you see the alert.</p>
    </div>
  );
}