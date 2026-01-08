// Simple in-memory custom data to simulate Farm OS-style entities

export const farmSummary = {
  farmName: "Green Valley Test Farm",
  location: "Test County",
  fields: [
    { id: "field-1", name: "North Field", areaHectares: 4.5, crop: "Wheat" },
    { id: "field-2", name: "East Field", areaHectares: 3.2, crop: "Corn" }
  ],
  animals: [
    { id: "animal-1", species: "Cow", count: 12 },
    { id: "animal-2", species: "Chicken", count: 40 }
  ],
  updatedAt: new Date().toISOString()
};

export function getFarmSummary() {
  // In a real implementation you would query Farm OS here.
  // For now we just return the static object above.
  return farmSummary;
}


