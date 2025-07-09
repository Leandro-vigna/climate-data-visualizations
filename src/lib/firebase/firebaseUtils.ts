import { auth, db, storage } from "./firebase";
import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Auth functions
export const logoutUser = () => signOut(auth);

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

// Firestore functions
export const addDocument = (collectionName: string, data: any) =>
  addDoc(collection(db, collectionName), data);

export const getDocuments = async (collectionName: string) => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const updateDocument = (collectionName: string, id: string, data: any) =>
  updateDoc(doc(db, collectionName, id), data);

export const deleteDocument = (collectionName: string, id: string) =>
  deleteDoc(doc(db, collectionName, id));

// Storage functions
export const uploadFile = async (file: File, path: string) => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

// Default sunburst data with WORLD, Argentina, India, United States (full breakdown)
const defaultSunburstData = [
  // WORLD
  { id: "1", location: "WORLD", sector: "Energy", subsector: "", subSubsector: "", value: 73.2 },
  { id: "2", location: "WORLD", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "", value: 24.2 },
  { id: "3", location: "WORLD", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Iron and steel", value: 7.2 },
  { id: "4", location: "WORLD", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Non-ferrous metals", value: 0.7 },
  { id: "5", location: "WORLD", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Chemical & petrochemical", value: 3.6 },
  { id: "6", location: "WORLD", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Food & tobacco", value: 1.0 },
  { id: "7", location: "WORLD", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Paper & pulp", value: 0.6 },
  { id: "8", location: "WORLD", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Machinery", value: 0.5 },
  { id: "9", location: "WORLD", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Other industry", value: 10.6 },
  { id: "10", location: "WORLD", sector: "Energy", subsector: "Transport", subSubsector: "", value: 16.2 },
  { id: "11", location: "WORLD", sector: "Energy", subsector: "Transport", subSubsector: "Road Transport", value: 11.9 },
  { id: "12", location: "WORLD", sector: "Energy", subsector: "Transport", subSubsector: "Aviation", value: 1.4 },
  { id: "13", location: "WORLD", sector: "Energy", subsector: "Transport", subSubsector: "Shipping", value: 2.7 },
  { id: "14", location: "WORLD", sector: "Energy", subsector: "Transport", subSubsector: "Rail", value: 0.4 },
  { id: "15", location: "WORLD", sector: "Energy", subsector: "Transport", subSubsector: "Pipeline", value: 0.3 },
  { id: "16", location: "WORLD", sector: "Energy", subsector: "Energy use in buildings", subSubsector: "", value: 17.5 },
  { id: "17", location: "WORLD", sector: "Energy", subsector: "Energy use in buildings", subSubsector: "Residential buildings", value: 10.9 },
  { id: "18", location: "WORLD", sector: "Energy", subsector: "Energy use in buildings", subSubsector: "Commercial", value: 6.6 },
  { id: "19", location: "WORLD", sector: "Energy", subsector: "Unallocated fuel combustion", subSubsector: "", value: 7.8 },
  { id: "20", location: "WORLD", sector: "Energy", subsector: "Fugitive emissions from energy production", subSubsector: "", value: 5.8 },
  { id: "21", location: "WORLD", sector: "Energy", subsector: "Energy in Agriculture & Fishing", subSubsector: "", value: 1.7 },
  { id: "22", location: "WORLD", sector: "Agriculture, Forestry & Land Use", subsector: "", subSubsector: "", value: 18.4 },
  { id: "23", location: "WORLD", sector: "Agriculture, Forestry & Land Use", subsector: "Livestock & manure", subSubsector: "", value: 5.8 },
  { id: "24", location: "WORLD", sector: "Agriculture, Forestry & Land Use", subsector: "Agricultural soils", subSubsector: "", value: 4.1 },
  { id: "25", location: "WORLD", sector: "Agriculture, Forestry & Land Use", subsector: "Rice cultivation", subSubsector: "", value: 1.3 },
  { id: "26", location: "WORLD", sector: "Agriculture, Forestry & Land Use", subsector: "Crop burning", subSubsector: "", value: 3.5 },
  { id: "27", location: "WORLD", sector: "Agriculture, Forestry & Land Use", subsector: "Deforestation", subSubsector: "", value: 2.2 },
  { id: "28", location: "WORLD", sector: "Agriculture, Forestry & Land Use", subsector: "Cropland", subSubsector: "", value: 1.4 },
  { id: "29", location: "WORLD", sector: "Agriculture, Forestry & Land Use", subsector: "Grassland", subSubsector: "", value: 0.1 },
  { id: "30", location: "WORLD", sector: "Industry", subsector: "", subSubsector: "", value: 5.2 },
  { id: "31", location: "WORLD", sector: "Industry", subsector: "Cement", subSubsector: "", value: 3 },
  { id: "32", location: "WORLD", sector: "Industry", subsector: "Chemicals", subSubsector: "", value: 2.2 },
  { id: "33", location: "WORLD", sector: "Waste", subsector: "", subSubsector: "", value: 3.2 },
  { id: "34", location: "WORLD", sector: "Waste", subsector: "Landfills", subSubsector: "", value: 1.9 },
  { id: "35", location: "WORLD", sector: "Waste", subsector: "Wastewater", subSubsector: "", value: 1.3 },

  // Argentina
  { id: "36", location: "Argentina", sector: "Energy", subsector: "", subSubsector: "", value: 60 },
  { id: "37", location: "Argentina", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "", value: 19.84 },
  { id: "38", location: "Argentina", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Iron and steel", value: 5.9 },
  { id: "39", location: "Argentina", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Non-ferrous metals", value: 0.57 },
  { id: "40", location: "Argentina", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Chemical & petrochemical", value: 2.95 },
  { id: "41", location: "Argentina", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Food & tobacco", value: 0.82 },
  { id: "42", location: "Argentina", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Paper & pulp", value: 0.49 },
  { id: "43", location: "Argentina", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Machinery", value: 0.41 },
  { id: "44", location: "Argentina", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Other industry", value: 8.69 },
  { id: "45", location: "Argentina", sector: "Energy", subsector: "Transport", subSubsector: "", value: 13.28 },
  { id: "46", location: "Argentina", sector: "Energy", subsector: "Transport", subSubsector: "Road Transport", value: 9.76 },
  { id: "47", location: "Argentina", sector: "Energy", subsector: "Transport", subSubsector: "Aviation", value: 1.15 },
  { id: "48", location: "Argentina", sector: "Energy", subsector: "Transport", subSubsector: "Shipping", value: 2.21 },
  { id: "49", location: "Argentina", sector: "Energy", subsector: "Transport", subSubsector: "Rail", value: 0.33 },
  { id: "50", location: "Argentina", sector: "Energy", subsector: "Transport", subSubsector: "Pipeline", value: 0.25 },
  { id: "51", location: "Argentina", sector: "Energy", subsector: "Energy use in buildings", subSubsector: "", value: 14.34 },
  { id: "52", location: "Argentina", sector: "Energy", subsector: "Energy use in buildings", subSubsector: "Residential buildings", value: 8.93 },
  { id: "53", location: "Argentina", sector: "Energy", subsector: "Energy use in buildings", subSubsector: "Commercial", value: 5.41 },
  { id: "54", location: "Argentina", sector: "Energy", subsector: "Unallocated fuel combustion", subSubsector: "", value: 6.39 },
  { id: "55", location: "Argentina", sector: "Energy", subsector: "Fugitive emissions from energy production", subSubsector: "", value: 4.75 },
  { id: "56", location: "Argentina", sector: "Energy", subsector: "Energy in Agriculture & Fishing", subSubsector: "", value: 1.39 },
  { id: "57", location: "Argentina", sector: "Agriculture, Forestry & Land Use", subsector: "", subSubsector: "", value: 25 },
  { id: "58", location: "Argentina", sector: "Agriculture, Forestry & Land Use", subsector: "Livestock & manure", subSubsector: "", value: 7.88 },
  { id: "59", location: "Argentina", sector: "Agriculture, Forestry & Land Use", subsector: "Agricultural soils", subSubsector: "", value: 5.57 },
  { id: "60", location: "Argentina", sector: "Agriculture, Forestry & Land Use", subsector: "Rice cultivation", subSubsector: "", value: 1.77 },
  { id: "61", location: "Argentina", sector: "Agriculture, Forestry & Land Use", subsector: "Crop burning", subSubsector: "", value: 4.76 },
  { id: "62", location: "Argentina", sector: "Agriculture, Forestry & Land Use", subsector: "Deforestation", subSubsector: "", value: 2.99 },
  { id: "63", location: "Argentina", sector: "Agriculture, Forestry & Land Use", subsector: "Cropland", subSubsector: "", value: 1.9 },
  { id: "64", location: "Argentina", sector: "Agriculture, Forestry & Land Use", subsector: "Grassland", subSubsector: "", value: 0.14 },
  { id: "65", location: "Argentina", sector: "Industry", subsector: "", subSubsector: "", value: 8 },
  { id: "66", location: "Argentina", sector: "Industry", subsector: "Cement", subSubsector: "", value: 4.62 },
  { id: "67", location: "Argentina", sector: "Industry", subsector: "Chemicals", subSubsector: "", value: 3.38 },
  { id: "68", location: "Argentina", sector: "Waste", subsector: "", subSubsector: "", value: 7 },
  { id: "69", location: "Argentina", sector: "Waste", subsector: "Landfills", subSubsector: "", value: 4.16 },
  { id: "70", location: "Argentina", sector: "Waste", subsector: "Wastewater", subSubsector: "", value: 2.84 },

  // India
  { id: "71", location: "India", sector: "Energy", subsector: "", subSubsector: "", value: 75 },
  { id: "72", location: "India", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "", value: 24.8 },
  { id: "73", location: "India", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Iron and steel", value: 7.38 },
  { id: "74", location: "India", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Non-ferrous metals", value: 0.72 },
  { id: "75", location: "India", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Chemical & petrochemical", value: 3.69 },
  { id: "76", location: "India", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Food & tobacco", value: 1.02 },
  { id: "77", location: "India", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Paper & pulp", value: 0.61 },
  { id: "78", location: "India", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Machinery", value: 0.51 },
  { id: "79", location: "India", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Other industry", value: 10.86 },
  { id: "80", location: "India", sector: "Energy", subsector: "Transport", subSubsector: "", value: 16.6 },
  { id: "81", location: "India", sector: "Energy", subsector: "Transport", subSubsector: "Road Transport", value: 12.19 },
  { id: "82", location: "India", sector: "Energy", subsector: "Transport", subSubsector: "Aviation", value: 1.43 },
  { id: "83", location: "India", sector: "Energy", subsector: "Transport", subSubsector: "Shipping", value: 2.77 },
  { id: "84", location: "India", sector: "Energy", subsector: "Transport", subSubsector: "Rail", value: 0.41 },
  { id: "85", location: "India", sector: "Energy", subsector: "Transport", subSubsector: "Pipeline", value: 0.31 },
  { id: "86", location: "India", sector: "Energy", subsector: "Energy use in buildings", subSubsector: "", value: 17.93 },
  { id: "87", location: "India", sector: "Energy", subsector: "Energy use in buildings", subSubsector: "Residential buildings", value: 11.17 },
  { id: "88", location: "India", sector: "Energy", subsector: "Energy use in buildings", subSubsector: "Commercial", value: 6.76 },
  { id: "89", location: "India", sector: "Energy", subsector: "Unallocated fuel combustion", subSubsector: "", value: 7.99 },
  { id: "90", location: "India", sector: "Energy", subsector: "Fugitive emissions from energy production", subSubsector: "", value: 5.94 },
  { id: "91", location: "India", sector: "Energy", subsector: "Energy in Agriculture & Fishing", subSubsector: "", value: 1.74 },
  { id: "92", location: "India", sector: "Agriculture, Forestry & Land Use", subsector: "", subSubsector: "", value: 18 },
  { id: "93", location: "India", sector: "Agriculture, Forestry & Land Use", subsector: "Livestock & manure", subSubsector: "", value: 5.67 },
  { id: "94", location: "India", sector: "Agriculture, Forestry & Land Use", subsector: "Agricultural soils", subSubsector: "", value: 4.01 },
  { id: "95", location: "India", sector: "Agriculture, Forestry & Land Use", subsector: "Rice cultivation", subSubsector: "", value: 1.27 },
  { id: "96", location: "India", sector: "Agriculture, Forestry & Land Use", subsector: "Crop burning", subSubsector: "", value: 3.42 },
  { id: "97", location: "India", sector: "Agriculture, Forestry & Land Use", subsector: "Deforestation", subSubsector: "", value: 2.15 },
  { id: "98", location: "India", sector: "Agriculture, Forestry & Land Use", subsector: "Cropland", subSubsector: "", value: 1.37 },
  { id: "99", location: "India", sector: "Agriculture, Forestry & Land Use", subsector: "Grassland", subSubsector: "", value: 0.1 },
  { id: "100", location: "India", sector: "Industry", subsector: "", subSubsector: "", value: 4 },
  { id: "101", location: "India", sector: "Industry", subsector: "Cement", subSubsector: "", value: 2.31 },
  { id: "102", location: "India", sector: "Industry", subsector: "Chemicals", subSubsector: "", value: 1.69 },
  { id: "103", location: "India", sector: "Waste", subsector: "", subSubsector: "", value: 3 },
  { id: "104", location: "India", sector: "Waste", subsector: "Landfills", subSubsector: "", value: 1.78 },
  { id: "105", location: "India", sector: "Waste", subsector: "Wastewater", subSubsector: "", value: 1.22 },

  // United States
  { id: "106", location: "United States", sector: "Energy", subsector: "", subSubsector: "", value: 50 },
  { id: "107", location: "United States", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "", value: 16.53 },
  { id: "108", location: "United States", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Iron and steel", value: 4.92 },
  { id: "109", location: "United States", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Non-ferrous metals", value: 0.48 },
  { id: "110", location: "United States", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Chemical & petrochemical", value: 2.46 },
  { id: "111", location: "United States", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Food & tobacco", value: 0.68 },
  { id: "112", location: "United States", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Paper & pulp", value: 0.41 },
  { id: "113", location: "United States", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Machinery", value: 0.34 },
  { id: "114", location: "United States", sector: "Energy", subsector: "Energy use in Industry", subSubsector: "Other industry", value: 7.24 },
  { id: "115", location: "United States", sector: "Energy", subsector: "Transport", subSubsector: "", value: 11.07 },
  { id: "116", location: "United States", sector: "Energy", subsector: "Transport", subSubsector: "Road Transport", value: 8.13 },
  { id: "117", location: "United States", sector: "Energy", subsector: "Transport", subSubsector: "Aviation", value: 0.96 },
  { id: "118", location: "United States", sector: "Energy", subsector: "Transport", subSubsector: "Shipping", value: 1.85 },
  { id: "119", location: "United States", sector: "Energy", subsector: "Transport", subSubsector: "Rail", value: 0.27 },
  { id: "120", location: "United States", sector: "Energy", subsector: "Transport", subSubsector: "Pipeline", value: 0.2 },
  { id: "121", location: "United States", sector: "Energy", subsector: "Energy use in buildings", subSubsector: "", value: 11.95 },
  { id: "122", location: "United States", sector: "Energy", subsector: "Energy use in buildings", subSubsector: "Residential buildings", value: 7.44 },
  { id: "123", location: "United States", sector: "Energy", subsector: "Energy use in buildings", subSubsector: "Commercial", value: 4.51 },
  { id: "124", location: "United States", sector: "Energy", subsector: "Unallocated fuel combustion", subSubsector: "", value: 5.33 },
  { id: "125", location: "United States", sector: "Energy", subsector: "Fugitive emissions from energy production", subSubsector: "", value: 3.96 },
  { id: "126", location: "United States", sector: "Energy", subsector: "Energy in Agriculture & Fishing", subSubsector: "", value: 1.16 },
  { id: "127", location: "United States", sector: "Agriculture, Forestry & Land Use", subsector: "", subSubsector: "", value: 12 },
  { id: "128", location: "United States", sector: "Agriculture, Forestry & Land Use", subsector: "Livestock & manure", subSubsector: "", value: 3.78 },
  { id: "129", location: "United States", sector: "Agriculture, Forestry & Land Use", subsector: "Agricultural soils", subSubsector: "", value: 2.67 },
  { id: "130", location: "United States", sector: "Agriculture, Forestry & Land Use", subsector: "Rice cultivation", subSubsector: "", value: 0.85 },
  { id: "131", location: "United States", sector: "Agriculture, Forestry & Land Use", subsector: "Crop burning", subSubsector: "", value: 2.28 },
  { id: "132", location: "United States", sector: "Agriculture, Forestry & Land Use", subsector: "Deforestation", subSubsector: "", value: 1.43 },
  { id: "133", location: "United States", sector: "Agriculture, Forestry & Land Use", subsector: "Cropland", subSubsector: "", value: 0.91 },
  { id: "134", location: "United States", sector: "Agriculture, Forestry & Land Use", subsector: "Grassland", subSubsector: "", value: 0.07 },
  { id: "135", location: "United States", sector: "Industry", subsector: "", subSubsector: "", value: 30 },
  { id: "136", location: "United States", sector: "Industry", subsector: "Cement", subSubsector: "", value: 17.31 },
  { id: "137", location: "United States", sector: "Industry", subsector: "Chemicals", subSubsector: "", value: 12.69 },
  { id: "138", location: "United States", sector: "Waste", subsector: "", subSubsector: "", value: 8 },
  { id: "139", location: "United States", sector: "Waste", subsector: "Landfills", subSubsector: "", value: 4.75 },
  { id: "140", location: "United States", sector: "Waste", subsector: "Wastewater", subSubsector: "", value: 3.25 },
];

// Function to ensure default sunburst data is available
export const ensureDefaultSunburstData = async () => {
  try {
    const versions = await getDocuments('sunburstVersions');
    
    // If no versions exist, create a default one
    if (versions.length === 0) {
      const defaultVersion = {
        name: 'Default',
        tableData: defaultSunburstData,
        labelOverrides: {}
      };
      
      await addDocument('sunburstVersions', defaultVersion);
      console.log('Default sunburst data created successfully');
      return true;
    }
    
    // Always overwrite the first version's data
    const firstVersion = versions[0] as any;
    await updateDocument('sunburstVersions', firstVersion.id, {
      tableData: defaultSunburstData
    });
    console.log('Default sunburst data forcibly updated');
    return true;
  } catch (error) {
    console.error('Error ensuring default sunburst data:', error);
    throw error;
  }
};
