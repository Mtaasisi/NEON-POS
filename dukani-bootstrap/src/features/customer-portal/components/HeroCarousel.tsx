import React, { useEffect, useRef, useState } from 'react';

export interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaText?: string;
  onCta?: () => void;
}

interface HeroCarouselProps {
  slides: HeroSlide[];
  autoplay?: boolean;
  interval?: number;
}

const HeroCarousel: React.FC<HeroCarouselProps> = ({ slides, autoplay = true, interval = 4000 }) => {
  if (!slides || slides.length === 0) return null;

  const [index, setIndex] = useState(0);
  const slidesCount = slides.length;
  const autoplayRef = useRef<number | null>(null);

  useEffect(() => {
    if (!autoplay || slidesCount <= 1) return;
    autoplayRef.current = window.setInterval(() => {
      setIndex(prev => (prev + 1) % slidesCount);
    }, interval);
    return () => {
      if (autoplayRef.current) {
        window.clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
    };
  }, [autoplay, interval, slidesCount]);

  const goPrev = () => setIndex(prev => (prev - 1 + slidesCount) % slidesCount);
  const goNext = () => setIndex(prev => (prev + 1) % slidesCount);

  return (
    <div className="px-4 pb-4">
      <div className="relative">
        {/* Track */}
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ width: `${slidesCount * 100}%`, transform: `translateX(-${(index * 100) / slidesCount}%)` }}
          >
            {slides.map((slide) => (
              <div key={slide.id} className="w-full flex-shrink-0 px-2">
                <div
                  className="relative overflow-hidden rounded-[28px] bg-black text-white h-56 md:h-72 lg:h-80"
                  style={{
                    backgroundImage: slide.imageUrl ? `url('${slide.imageUrl}')` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                  <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold">{slide.title}</h3>
                      {slide.subtitle && (
                        <p className="mt-2 text-sm md:text-base text-white/90 max-w-lg">
                          {slide.subtitle}
                        </p>
                      )}
                    </div>

                    {slide.ctaText && (
                      <div>
                        <button
                          onClick={slide.onCta}
                          className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-medium shadow-sm mt-2"
                        >
                          {slide.ctaText} <span aria-hidden>→</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation arrows */}
          {slidesCount > 1 && (
            <>
              <button
                onClick={goPrev}
                aria-label="Previous slide"
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-10 h-10 flex items-center justify-center shadow"
              >
                ‹
              </button>
              <button
                onClick={goNext}
                aria-label="Next slide"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-10 h-10 flex items-center justify-center shadow"
              >
                ›
              </button>
            </>
          )}
        </div>

        {/* Dots */}
        {slidesCount > 1 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`w-2 h-2 rounded-full ${i === index ? 'bg-white' : 'bg-white/50'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroCarousel;


