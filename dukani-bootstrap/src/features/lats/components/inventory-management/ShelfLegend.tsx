import React from 'react';

interface ShelfLegendProps {
  className?: string;
}

const ShelfLegend: React.FC<ShelfLegendProps> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <h4 className="font-semibold text-gray-900 mb-3 text-sm">Legend</h4>
      
      <div className="space-y-2">
        {/* Status Indicators */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Status</p>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-700">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-xs text-gray-700">Inactive</span>
            </div>
          </div>
        </div>

        {/* Special Features */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Features</p>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-700">Refrigerated</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-xs text-gray-700">Requires Ladder</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs text-gray-700">Not Accessible</span>
            </div>
          </div>
        </div>

        {/* Shelf Types */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Types</p>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">Standard</span>
            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">Refrigerated</span>
            <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">Display</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShelfLegend;

