import React, { useRef, useState, DragEvent } from 'react';
import { Upload, FileType, AlertCircle, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import shp from 'shpjs';
import { kml } from '@tmcw/togeojson';
import JSZip from 'jszip';
import { FeatureCollection } from 'geojson';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB, WARN_FILE_SIZE_BYTES, WARN_FILE_SIZE_MB } from '../utils/constants';

interface Props {
  onDataLoaded: (data: any, fileName: string) => void;
  onCsvLoaded: (data: any[], fileName: string) => void;
  onError: (msg: string) => void;
}

export const FileUpload: React.FC<Props> = ({ onDataLoaded, onCsvLoaded, onError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const checkFileSize = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      onError(`File is too large (${(file.size / 1024 / 1024).toFixed(0)} MB). Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`);
      return false;
    }
    if (file.size > WARN_FILE_SIZE_BYTES) {
      console.warn(`Large file detected (${(file.size / 1024 / 1024).toFixed(0)} MB). Processing may be slow.`);
    }
    return true;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!checkFileSize(file)) return;

    setLoading(true);
    setTimeout(() => processFile(file), 50);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!checkFileSize(file)) return;

    setLoading(true);
    setTimeout(() => processFile(file), 50);
  };

  const processFile = async (file: File) => {
    try {
      const name = file.name.toLowerCase();
      const isCsv = name.endsWith('.csv');
      const isJson = name.endsWith('.json') || name.endsWith('.geojson');
      const isKml = name.endsWith('.kml');
      const isKmz = name.endsWith('.kmz');
      const isZip = name.endsWith('.zip');

      if (isCsv) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setLoading(false);
            if (results.errors.length > 0 && results.data.length === 0) {
               onError("Failed to parse CSV file.");
               return;
            }
            onCsvLoaded(results.data as any[], file.name);
          },
          error: (err) => {
             setLoading(false);
             onError("Error reading CSV file: " + err.message);
          }
        });
        return;
      }

      if (isJson) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const json = JSON.parse(event.target?.result as string);
            validateAndLoad(json, file.name);
          } catch (err) {
            setLoading(false);
            onError("Failed to parse GeoJSON.");
          }
        };
        reader.readAsText(file);
        return;
      }

      if (isKml) {
        const reader = new FileReader();
        reader.onload = (event) => {
           try {
              const str = event.target?.result as string;
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(str, "text/xml");
              const geojson = kml(xmlDoc);
              validateAndLoad(geojson, file.name);
           } catch (err) {
              setLoading(false);
              onError("Failed to parse KML file.");
           }
        };
        reader.readAsText(file);
        return;
      }

      if (isKmz) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
                const buffer = event.target?.result as ArrayBuffer;
                const zip = await JSZip.loadAsync(buffer);

                const kmlFilename = Object.keys(zip.files).find(f => f.toLowerCase().endsWith('.kml'));

                if (!kmlFilename) {
                    throw new Error("No KML file found inside KMZ archive.");
                }

                const kmlFile = zip.file(kmlFilename);
                if (!kmlFile) throw new Error("Could not access KML file.");

                const kmlString = await kmlFile.async("string");

                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(kmlString, "text/xml");
                const geojson = kml(xmlDoc);
                validateAndLoad(geojson, file.name);

            } catch (err: any) {
                setLoading(false);
                onError("Failed to parse KMZ file: " + err.message);
            }
          };
          reader.readAsArrayBuffer(file);
          return;
      }

      if (isZip) {
         const reader = new FileReader();
         reader.onload = async (event) => {
             try {
                 const buffer = event.target?.result as ArrayBuffer;
                 const geojson = await shp(buffer);

                 let finalFC: FeatureCollection = { type: 'FeatureCollection', features: [] };

                 if (Array.isArray(geojson)) {
                     geojson.forEach(g => {
                         if (g.type === 'FeatureCollection') {
                             finalFC.features.push(...g.features);
                         }
                     });
                 } else {
                     finalFC = geojson;
                 }

                 validateAndLoad(finalFC, file.name);
             } catch (err: any) {
                 console.error(err);
                 setLoading(false);
                 onError("Failed to parse Shapefile (Zip): " + (err.message || "Unknown error"));
             }
         };
         reader.readAsArrayBuffer(file);
         return;
      }

      setLoading(false);
      onError("Unsupported file format. Please upload GeoJSON, CSV, KML/KMZ, or Zip (Shapefile).");
    } catch (e: any) {
        setLoading(false);
        onError("Unexpected error: " + e.message);
    }
  };

  const validateAndLoad = (json: any, fileName: string) => {
      if (!json.type) {
        setLoading(false);
        throw new Error("Invalid format: Missing GeoJSON type");
      }

      const fc = json.type === 'Feature' ? { type: 'FeatureCollection', features: [json] } : json;

      if (fc.type !== 'FeatureCollection') {
          setLoading(false);
          onError("Invalid GeoJSON: Must be a FeatureCollection.");
          return;
      }

      setLoading(false);
      onDataLoaded(fc, fileName);
  };

  return (
    <div
      className={`w-full p-8 border-2 border-dashed rounded-xl transition-all cursor-pointer group relative ${
        loading
          ? 'border-blue-500 bg-blue-900/10 cursor-wait'
          : dragOver
            ? 'border-blue-400 bg-blue-900/20 scale-[1.02]'
            : 'border-gray-700 bg-gray-900/50 hover:bg-gray-900'
      }`}
      onClick={() => !loading && fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >

      {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm rounded-xl z-10">
              <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-2" />
                  <span className="text-blue-200 font-medium">Parsing file...</span>
              </div>
          </div>
      )}

      <div className="flex flex-col items-center justify-center space-y-4 opacity-100 transition-opacity">
        <div className={`p-4 rounded-full transition-colors ${dragOver ? 'bg-blue-600/30' : 'bg-blue-600/10 group-hover:bg-blue-600/20'}`}>
          <Upload className="w-8 h-8 text-blue-400" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-gray-200">
            {dragOver ? 'Drop your file here' : 'Drop your file here or click to browse'}
          </p>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            Supports GeoJSON, CSV (Points), KML/KMZ, and Shapefile (Zip)
          </p>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".json,.geojson,.csv,.kml,.kmz,.zip"
          onChange={handleFile}
          disabled={loading}
        />
      </div>
    </div>
  );
};
