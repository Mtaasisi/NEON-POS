import React from 'react';
import { Star } from 'lucide-react';

interface RatingProps {
  value?: number;
  count?: number;
}

const Rating: React.FC<RatingProps> = ({ value = 0, count = 0 }) => {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={16} className={i < rounded ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
        ))}
      </div>
      <div className="text-sm font-medium text-gray-800">{value.toFixed(1)}</div>
      <div className="text-sm text-gray-500">({count})</div>
    </div>
  );
};

export default Rating;


