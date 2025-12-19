import React from 'react';

interface BrandScrollerProps {
  logos: string[]; // urls
}

const BrandScroller: React.FC<BrandScrollerProps> = ({ logos }) => {
  if (!logos || logos.length === 0) return null;
  return (
    <div className="px-4 py-4">
      <div className="flex gap-4 overflow-x-auto no-scrollbar items-center">
        {logos.map((logo, i) => (
          <div key={i} className="flex-shrink-0 w-28 h-12 rounded-lg bg-white/20 flex items-center justify-center border border-gray-100">
            <img src={logo} alt={`brand-${i}`} className="max-h-8 object-contain" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrandScroller;


