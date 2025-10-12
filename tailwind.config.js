/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        // Standard breakpoints
        'tablet': '768px',
        'laptop': '1024px',
        'desktop': '1280px',
        
        // High resolution breakpoints
        'fhd': '1920px',      // Full HD
        'qhd': '2048px',      // QHD / 2K (2048x1536)
        '3xl': '2560px',      // WQHD
        '4xl': '3024px',      // High-res displays (3024x1964)
        '5xl': '3840px',      // 4K UHD
        
        // Specific device breakpoints
        'ipad-pro': '2048px', // iPad Pro and similar tablets
        'retina': '3024px',   // Retina displays
      },
      fontSize: {
        // Responsive font sizes that scale with viewport
        'responsive-xs': 'clamp(0.75rem, 1vw, 0.875rem)',
        'responsive-sm': 'clamp(0.875rem, 1.2vw, 1rem)',
        'responsive-base': 'clamp(1rem, 1.4vw, 1.125rem)',
        'responsive-lg': 'clamp(1.125rem, 1.6vw, 1.25rem)',
        'responsive-xl': 'clamp(1.25rem, 1.8vw, 1.5rem)',
        'responsive-2xl': 'clamp(1.5rem, 2vw, 1.875rem)',
        'responsive-3xl': 'clamp(1.875rem, 2.5vw, 2.25rem)',
      },
    },
  },
  plugins: [],
}