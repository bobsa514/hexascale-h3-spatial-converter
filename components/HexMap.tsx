import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap, useMapEvents } from 'react-leaflet';
import * as h3 from 'h3-js';
import L from 'leaflet';
import { HexResult } from '../types';
import { valueToColor, getNumericColumns } from '../utils/colorScale';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, VIEWPORT_HEX_RENDER_COUNT, MAX_HEX_RENDER_COUNT } from '../utils/constants';

interface Props {
  hexData: HexResult[];
}

const HexRenderer: React.FC<{
  hexData: HexResult[];
  colorColumn: string | null;
}> = ({ hexData, colorColumn }) => {
  const map = useMap();
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const [selectedHex, setSelectedHex] = useState<HexResult | null>(null);

  const updateBounds = useCallback(() => {
    setBounds(map.getBounds());
  }, [map]);

  useMapEvents({
    moveend: updateBounds,
    zoomend: updateBounds,
  });

  useEffect(() => {
    updateBounds();
  }, [updateBounds]);

  // Compute color range
  const { min, max } = useMemo(() => {
    if (!colorColumn) return { min: 0, max: 0 };
    let min = Infinity;
    let max = -Infinity;
    for (const d of hexData) {
      const v = d[colorColumn];
      if (typeof v === 'number' && Number.isFinite(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 0 : max };
  }, [hexData, colorColumn]);

  // Build hex data map for click inspection
  const hexDataMap = useMemo(() => {
    const m = new Map<string, HexResult>();
    hexData.forEach(d => m.set(d.hexId, d));
    return m;
  }, [hexData]);

  // Viewport-filtered + limited polygons
  const { polygons, totalCount, isFiltered } = useMemo(() => {
    const useViewportFilter = hexData.length > MAX_HEX_RENDER_COUNT;
    const limit = useViewportFilter ? VIEWPORT_HEX_RENDER_COUNT : MAX_HEX_RENDER_COUNT;

    let filteredData = hexData;
    let isFiltered = false;

    if (useViewportFilter && bounds) {
      filteredData = hexData.filter(d => {
        try {
          const [lat, lng] = h3.cellToLatLng(d.hexId);
          return bounds.contains([lat, lng]);
        } catch {
          return false;
        }
      });
      isFiltered = filteredData.length < hexData.length;
    }

    const sliced = filteredData.slice(0, limit);

    const result = sliced.map(d => {
      const boundary = h3.cellToBoundary(d.hexId);
      const color = colorColumn
        ? valueToColor(d[colorColumn] ?? 0, min, max)
        : '#3b82f6';
      return {
        positions: boundary,
        id: d.hexId,
        color,
      };
    });

    return { polygons: result, totalCount: hexData.length, isFiltered };
  }, [hexData, bounds, colorColumn, min, max]);

  useEffect(() => {
    map.invalidateSize();

    if (polygons.length > 0) {
      const allPoints = polygons.flatMap(p => p.positions);
      if (allPoints.length > 0) {
        const fitBounds = L.latLngBounds(allPoints as [number, number][]);
        map.fitBounds(fitBounds, { padding: [50, 50], animate: true });
      }
    }
  }, [hexData.length]); // Only fit on data change, not viewport changes

  if (hexData.length === 0) return null;

  return (
    <>
      {polygons.map(p => (
        <Polygon
          key={p.id}
          positions={p.positions}
          pathOptions={{ color: p.color, weight: 1, fillOpacity: 0.4 }}
          eventHandlers={{
            click: () => {
              const data = hexDataMap.get(p.id);
              if (data) setSelectedHex(data);
            },
          }}
        />
      ))}
      {selectedHex && (
        <Popup
          position={h3.cellToLatLng(selectedHex.hexId) as [number, number]}
          eventHandlers={{ remove: () => setSelectedHex(null) }}
        >
          <div className="text-xs max-h-48 overflow-y-auto">
            <div className="font-bold text-gray-800 mb-1 font-mono text-[10px]">{selectedHex.hexId}</div>
            {Object.entries(selectedHex)
              .filter(([k]) => k !== 'hexId')
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-0.5 border-b border-gray-100">
                  <span className="text-gray-600">{k}</span>
                  <span className="font-mono text-gray-900">
                    {typeof v === 'number' ? v.toFixed(4) : String(v)}
                  </span>
                </div>
              ))}
          </div>
        </Popup>
      )}
    </>
  );
};

const MapSizer: React.FC = () => {
  const map = useMap();
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = map.getContainer();
    containerRef.current = container;

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [map]);

  return null;
};

export const HexMap: React.FC<Props> = ({ hexData }) => {
  const numericCols = useMemo(() => {
    if (hexData.length === 0) return [];
    return getNumericColumns(hexData[0]);
  }, [hexData]);

  const [colorColumn, setColorColumn] = useState<string | null>(null);

  // Auto-select first numeric column
  useEffect(() => {
    if (numericCols.length > 0 && !colorColumn) {
      setColorColumn(numericCols[0]);
    }
  }, [numericCols]);

  const exceedsRenderLimit = hexData.length > MAX_HEX_RENDER_COUNT;

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl border border-gray-800">
      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={DEFAULT_MAP_ZOOM}
        style={{ height: '100%', width: '100%', background: '#111827' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapSizer />
        <HexRenderer hexData={hexData} colorColumn={colorColumn} />
      </MapContainer>

      {/* Column selector overlay */}
      {numericCols.length > 0 && (
        <div className="absolute top-4 left-4 z-[1000] bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-700 p-2">
          <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Color by</label>
          <select
            className="bg-gray-800 border border-gray-600 rounded text-xs text-gray-300 px-2 py-1 outline-none min-w-[120px]"
            value={colorColumn || ''}
            onChange={e => setColorColumn(e.target.value || null)}
          >
            <option value="">None (solid blue)</option>
            {numericCols.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {/* Color legend */}
      {colorColumn && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-700 p-2">
          <div className="text-[10px] text-gray-400 mb-1">{colorColumn}</div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 font-mono">Low</span>
            <div className="w-24 h-3 rounded" style={{
              background: 'linear-gradient(to right, rgb(59,130,246), rgb(234,179,8), rgb(239,68,68))'
            }} />
            <span className="text-[10px] text-gray-500 font-mono">High</span>
          </div>
        </div>
      )}

      {/* Render count info */}
      <div className={`absolute bottom-4 right-4 p-2 rounded text-xs z-[1000] ${exceedsRenderLimit ? 'bg-orange-900/90 text-orange-200 border border-orange-700' : 'bg-gray-900/90 text-gray-400'}`}>
        {exceedsRenderLimit
          ? `${hexData.length.toLocaleString()} total hexes \u2014 showing viewport subset. Zoom in for detail.`
          : `Showing ${Math.min(hexData.length, MAX_HEX_RENDER_COUNT).toLocaleString()} of ${hexData.length.toLocaleString()} cells`
        }
      </div>
    </div>
  );
};
