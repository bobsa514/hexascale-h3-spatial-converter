import React from 'react';
import { X, Table } from 'lucide-react';

interface Props {
  data: any[];
  onClose: () => void;
}

export const DataPreviewModal: React.FC<Props> = ({ data, onClose }) => {
  if (!data || data.length === 0) return null;

  const headers = Object.keys(data[0]);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-lg font-bold text-white flex items-center">
            <Table className="w-5 h-5 mr-2 text-blue-400" />
            Data Preview (First 5 Rows)
          </h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="overflow-auto p-0 flex-1">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-gray-800/50 sticky top-0">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="p-3 font-mono font-medium text-gray-400 border-b border-gray-700 whitespace-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-gray-800/30">
                  {headers.map((header) => (
                    <td key={`${i}-${header}`} className="p-3 text-gray-300 whitespace-nowrap max-w-[200px] truncate" title={String(row[header])}>
                      {row[header] !== null && row[header] !== undefined ? String(row[header]) : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-3 border-t border-gray-800 bg-gray-900/50 text-xs text-gray-500 text-right rounded-b-xl">
          Showing {data.length} rows
        </div>
      </div>
    </div>
  );
};
