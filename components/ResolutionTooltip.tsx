import React, { useState } from 'react';
import { Info } from 'lucide-react';
import * as h3 from 'h3-js';
import { H3_RESOLUTION_MIN, H3_RESOLUTION_MAX } from '../utils/constants';

interface Props {
  resolution: number;
}

function formatArea(m2: number): string {
  if (m2 >= 1e6) return `${(m2 / 1e6).toFixed(2)} km\u00B2`;
  return `${m2.toFixed(0)} m\u00B2`;
}

function formatLength(km: number): string {
  if (km >= 1) return `${km.toFixed(2)} km`;
  return `${(km * 1000).toFixed(0)} m`;
}

export const ResolutionTooltip: React.FC<Props> = ({ resolution }) => {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-gray-500 hover:text-blue-400 transition-colors p-0.5"
        type="button"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div className="absolute left-0 top-6 z-50 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 text-xs">
          <div className="font-bold text-white mb-2">H3 Resolution Reference</div>
          <table className="w-full text-gray-400">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-1">Res</th>
                <th className="text-left py-1">Hex Area</th>
                <th className="text-left py-1">Edge</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: H3_RESOLUTION_MAX - H3_RESOLUTION_MIN + 1 }, (_, i) => {
                const res = H3_RESOLUTION_MIN + i;
                const area = h3.getHexagonAreaAvg(res, h3.UNITS.m2);
                const edge = h3.getHexagonEdgeLengthAvg(res, h3.UNITS.km);
                const isCurrent = res === resolution;
                return (
                  <tr key={res} className={isCurrent ? 'text-blue-300 font-medium' : ''}>
                    <td className="py-0.5">{res}</td>
                    <td className="py-0.5">{formatArea(area)}</td>
                    <td className="py-0.5">{formatLength(edge)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </span>
  );
};
