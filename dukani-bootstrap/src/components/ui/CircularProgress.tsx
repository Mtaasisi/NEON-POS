import React from 'react';

interface CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'white';
}

/**
 * A smooth circular loading spinner with gradient effect
 * Based on modern design patterns
 */
const CircularProgress: React.FC<CircularProgressProps> = ({ 
  size = 64,
  strokeWidth = 4,
  className = '',
  color = 'blue'
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const center = size / 2;

  // Color mappings with beautiful gradients
  const colors = {
    blue: {
      primary: '#3B82F6',
      secondary: '#BFDBFE',
      gradient: ['#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#60A5FA'] // Pure blue gradient
    },
    green: {
      primary: '#10B981',
      secondary: '#BBF7D0',
      gradient: ['#34D399', '#10B981', '#059669']
    },
    purple: {
      primary: '#8B5CF6',
      secondary: '#DDD6FE',
      gradient: ['#A78BFA', '#8B5CF6', '#7C3AED']
    },
    orange: {
      primary: '#F97316',
      secondary: '#FED7AA',
      gradient: ['#FB923C', '#F97316', '#EA580C']
    },
    white: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.3)',
      gradient: ['#FFFFFF', '#F0F0F0', '#FFFFFF']
    }
  };

  const selectedColor = colors[color];

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="animate-spin"
        style={{ animationDuration: '1.2s' }}
      >
        {/* Define gradient - smooth multi-color transition */}
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
            {selectedColor.gradient.map((gradientColor, index) => (
              <stop 
                key={index} 
                offset={`${(index / (selectedColor.gradient.length - 1)) * 100}%`} 
                stopColor={gradientColor} 
              />
            ))}
          </linearGradient>
        </defs>

        {/* Background circle (light/faded) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={selectedColor.secondary}
          strokeWidth={strokeWidth}
        />

        {/* Progress circle with gradient (vibrant) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#gradient-${color})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.25}
          transform={`rotate(-90 ${center} ${center})`}
          style={{
            transition: 'stroke-dashoffset 0.3s ease'
          }}
        />
      </svg>
    </div>
  );
};

export default CircularProgress;

