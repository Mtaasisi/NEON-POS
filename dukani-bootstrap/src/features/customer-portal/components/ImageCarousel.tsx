import React, { useEffect, useRef, useState } from 'react';
import { Share2, Heart } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  initialIndex?: number;
  isFavorite?: boolean;
  onShare?: () => void;
  onToggleFavorite?: () => void;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, initialIndex = 0, isFavorite = false, onShare, onToggleFavorite }) => {
  const [index, setIndex] = useState(initialIndex);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  const goPrev = () => setIndex(i => Math.max(0, i - 1));
  const goNext = () => setIndex(i => Math.min(images.length - 1, i + 1));

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    // swipe threshold
    if (diff > 50) {
      goPrev();
      touchStartX.current = null;
    } else if (diff < -50) {
      goNext();
      touchStartX.current = null;
    }
  };

  return (
    <div className="pb-6">
      <div className="max-w-7xl mx-auto">
        <div className="relative pt-6 pb-2">
          {/* Full-screen touch overlay for edge swiping */}
          <div
            className="fixed inset-0 z-10"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            style={{ pointerEvents: 'auto' }}
          />
          <div className="relative">
        <div
          ref={trackRef}
          className="rounded-[28px] overflow-hidden bg-gray-100 relative mx-4"
          style={{ height: 'min(56vh, 420px)' }}
        >
          {/* current image */}
          <img
            src={images[index]}
            alt={`slide-${index + 1}`}
            className="w-full h-full object-cover bg-white"
          />


          {/* image counter - bottom-center */}
          {images.length > 1 && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-4">
              <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                {index + 1} / {images.length}
              </div>
            </div>
          )}

          {/* overlay actions - bottom-right stacked */}
          <div className="absolute right-4 bottom-4 flex flex-col gap-3">
            <button
              onClick={onShare}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={onToggleFavorite}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow"
            >
              <Heart size={16} className={isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-700'} />
            </button>
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCarousel;


