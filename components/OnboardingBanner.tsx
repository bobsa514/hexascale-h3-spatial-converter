import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { ONBOARDING_DISMISSED_KEY } from '../utils/constants';
import sampleData from '../assets/sample-data.json';

interface Props {
  onLoadSample: (data: any, name: string) => void;
}

export const OnboardingBanner: React.FC<Props> = ({ onLoadSample }) => {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(ONBOARDING_DISMISSED_KEY) === 'true';
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
  };

  const handleLoadSample = () => {
    onLoadSample(sampleData, 'sample-data.geojson');
  };

  return (
    <div className="mb-6 p-5 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded-2xl border border-blue-800/40 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 p-1"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-4">
        <div className="p-2 bg-blue-600/20 rounded-lg">
          <Sparkles className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="text-white font-bold mb-1">Welcome to HexaScale</h3>
          <p className="text-gray-400 text-sm mb-3">
            Convert geospatial data to H3 hexagonal grids. Upload a GeoJSON, CSV, KML, or Shapefile to get started.
          </p>
          <button
            onClick={handleLoadSample}
            className="px-4 py-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 rounded-lg text-sm font-medium border border-blue-700/50 transition-colors"
          >
            Try our sample dataset
          </button>
        </div>
      </div>
    </div>
  );
};
