import React, { useState, useEffect } from 'react';
import { MapPin, Check, X } from 'lucide-react';

interface Props {
  columns: string[];
  onConfirm: (latCol: string, lonCol: string) => void;
  onCancel: () => void;
}

export const CsvColumnMapper: React.FC<Props> = ({ columns, onConfirm, onCancel }) => {
  const [latCol, setLatCol] = useState('');
  const [lonCol, setLonCol] = useState('');

  useEffect(() => {
    // Auto-detect columns
    const lowerCols = columns.map(c => c.toLowerCase());
    
    const latIndex = lowerCols.findIndex(c => ['lat', 'latitude', 'y', 'lat_dd'].includes(c));
    if (latIndex >= 0) setLatCol(columns[latIndex]);

    const lonIndex = lowerCols.findIndex(c => ['lon', 'lng', 'longitude', 'x', 'long', 'lon_dd'].includes(c));
    if (lonIndex >= 0) setLonCol(columns[lonIndex]);
  }, [columns]);

  const handleConfirm = () => {
    if (latCol && lonCol) {
      onConfirm(latCol, lonCol);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center mb-6">
          <div className="p-3 bg-blue-900/30 rounded-lg mr-4">
            <MapPin className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Map Coordinates</h3>
            <p className="text-sm text-gray-400">Select columns for location data</p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Latitude Column</label>
            <select 
              value={latCol} 
              onChange={(e) => setLatCol(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select Column...</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Longitude Column</label>
            <select 
              value={lonCol} 
              onChange={(e) => setLonCol(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select Column...</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex space-x-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4 mr-2" /> Cancel
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!latCol || !lonCol}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center shadow-lg shadow-blue-900/20"
          >
            <Check className="w-4 h-4 mr-2" /> Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
