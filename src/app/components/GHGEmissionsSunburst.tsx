import React from 'react';

interface GHGEmissionsSunburstProps {
  getSegmentColor: (index: number) => string;
}

export function GHGEmissionsSunburst({ getSegmentColor }: GHGEmissionsSunburstProps) {
  // Placeholder: Replace with your real sunburst chart implementation
  return (
    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
      <span className="text-gray-500">Sunburst chart will render here.</span>
      <div className="flex mt-4 space-x-2">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded-full"
            style={{ backgroundColor: getSegmentColor(i) }}
            title={`Color ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
} 