import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { animate } from 'animejs';
import { motion } from 'framer-motion';

// ============================================================================
// VENTURES DATA
// Panigrahana: Wedding Photography & Cinematography
// Aghhori: Branding, Marketing, Advertising, Corporate Shoots, TV Commercials
// ============================================================================
const VENTURES = [
  {
    id: 'panigrahna',
    number: '01',
    name: 'Panigrahana',
    category: 'Wedding Cinematography',
    headline: 'Preserving Sacred Unions and Authentic Love Stories',
    description:
      'Crafting bespoke wedding cinema, visual poetry, and candid moments to preserve your most cherished memories across generations.',
    // Pre-cached wedding photography image
    imageUrl: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=900&auto=format&fit=crop',
    link: '/inquiry/panigrahna',
    offerings: [
      { label: 'Cinematic Films', detail: '4K Cinema Productions' },
      { label: 'Candid Heritage', detail: 'Sacred Rituals and Joy' },
      { label: 'Editorial Shoots', detail: 'Pre and Post Wedding' }
    ]
  },
  {
    id: 'aghori',
    number: '02',
    name: 'Aghhori',
    category: 'Advertising and Media Productions',
    headline: 'Branding, TV Commercials and Corporate Shoots',
    description:
      'Producing high impact television commercials, brand campaigns, corporate event shoots, and visual advertising for leading enterprises.',
    // Pre-cached commercial production image
    imageUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=900&auto=format&fit=crop',
    link: '/inquiry/aghori',
    offerings: [
      { label: 'TV Commercials', detail: 'Ad Films and Broadcast' },
      { label: 'Brand Campaigns', detail: 'Creative Visual Marketing' },
      { label: 'Corporate Shoots', detail: 'Conferences and Events' }
    ]
  }
];

export default function InquirySelection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const cardRefs = [useRef(null), useRef(null)];
  const isAnimatingRef = useRef(false);

  // Set initial GPU-accelerated positions on mount
  useEffect(() => {
    const frontEl = cardRefs[0].current;
    const backEl = cardRefs[1].current;

    if (frontEl) {
      frontEl.style.transform = 'translate3d(0px, 0px, 0px) scale(1)';
      frontEl.style.opacity = '1';
      frontEl.style.zIndex = '20';
    }

    if (backEl) {
      const isMobile = window.innerWidth < 640;
      const offsetX = isMobile ? 14 : 32;
      const offsetY = isMobile ? -6 : -10;
      backEl.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0px) scale(0.95)`;
      backEl.style.opacity = '0.65';
      backEl.style.zIndex = '10';
    }
  }, []);

  // Highly optimized Anime.js card swap with 60/120fps hardware acceleration
  const swapCards = (targetIndex) => {
    if (targetIndex === activeIndex || isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    const currentEl = cardRefs[activeIndex].current;
    const targetEl = cardRefs[targetIndex].current;

    if (!currentEl || !targetEl) {
      setActiveIndex(targetIndex);
      isAnimatingRef.current = false;
      return;
    }

    const isMobile = window.innerWidth < 640;
    const behindX = isMobile ? 14 : 32;
    const behindY = isMobile ? -6 : -10;
    const swingOutX = targetIndex > activeIndex ? (isMobile ? -35 : -55) : (isMobile ? 35 : 55);

    // Bring incoming target card over outgoing card early for seamless depth
    targetEl.style.zIndex = '25';
    currentEl.style.zIndex = '15';

    // 1. Incoming card springs to center
    animate(targetEl, {
      translateX: [behindX, 0],
      translateY: [behindY, 0],
      scale: [0.95, 1],
      opacity: [0.65, 1],
      duration: 450,
      ease: 'out(3)',
      onComplete: () => {
        targetEl.style.zIndex = '20';
        isAnimatingRef.current = false;
      }
    });

    // 2. Outgoing card sweeps gracefully to behind position
    animate(currentEl, {
      translateX: [0, swingOutX, behindX],
      translateY: [0, -3, behindY],
      scale: [1, 0.97, 0.95],
      opacity: [1, 0.85, 0.65],
      duration: 480,
      ease: 'out(3)',
      onComplete: () => {
        currentEl.style.zIndex = '10';
      }
    });

    setActiveIndex(targetIndex);
  };

  const handleNext = () => {
    const nextIdx = (activeIndex + 1) % VENTURES.length;
    swapCards(nextIdx);
  };

  const handlePrev = () => {
    const prevIdx = (activeIndex - 1 + VENTURES.length) % VENTURES.length;
    swapCards(prevIdx);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-1 sm:py-2">
      {/* Top Header */}
      <div className="text-center space-y-1 sm:space-y-1.5 mb-2.5 sm:mb-4 max-w-xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl lg:text-[2rem] font-bold tracking-tight text-zinc-900 font-heading">
          Select a Venture
        </h2>

        <p className="text-xs sm:text-sm text-zinc-500 font-normal leading-normal font-sans max-w-md mx-auto">
          Choose the venture you want to inquire about. Our team will connect with you to discuss your requirements.
        </p>

        {/* iOS-Style Sliding Segmented Control */}
        <div className="pt-1.5 flex justify-center">
          <div className="relative inline-flex p-1 rounded-full bg-zinc-100 border border-zinc-200/80">
            {VENTURES.map((v, i) => {
              const isSelected = activeIndex === i;
              return (
                <button
                  key={v.id}
                  onClick={() => swapCards(i)}
                  className={`relative z-10 px-5 py-1.5 rounded-full text-xs font-semibold tracking-wider font-heading cursor-pointer transition-colors duration-200 ${
                    isSelected ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="iosSegmentedPill"
                      transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                      className="absolute inset-0 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.06)] -z-10"
                    />
                  )}
                  <span>{v.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stacked Deck Showcase */}
      <div className="relative px-2 sm:px-10 select-none">
        {/* Previous Button */}
        <button
          onClick={handlePrev}
          aria-label="Previous venture"
          className="absolute left-0 sm:left-1 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center shadow-lg hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-transform duration-150 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Next Button */}
        <button
          onClick={handleNext}
          aria-label="Next venture"
          className="absolute right-0 sm:right-1 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center shadow-lg hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-transform duration-150 cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Stacked Cards Container */}
        <div className="grid grid-cols-1 grid-rows-1 relative w-full pt-2 pb-1">
          {VENTURES.map((venture, index) => {
            const isFront = activeIndex === index;

            return (
              <div
                key={venture.id}
                ref={cardRefs[index]}
                onClick={() => {
                  if (!isFront) swapCards(index);
                }}
                style={{
                  gridColumn: '1 / -1',
                  gridRow: '1 / -1',
                  transformOrigin: 'center center',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  willChange: 'transform, opacity'
                }}
                className={`w-full bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-zinc-200/90 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08)] overflow-hidden min-h-[460px] sm:min-h-[470px] ${
                  isFront ? 'cursor-default' : 'cursor-pointer hover:opacity-80'
                }`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 p-6 sm:p-7 lg:p-8 items-stretch h-full">
                  {/* Left Column: Equal-Height Image Frame */}
                  <div className="lg:col-span-5 relative w-full h-60 sm:h-72 lg:h-auto min-h-[240px] lg:min-h-[360px] rounded-2xl sm:rounded-[1.6rem] overflow-hidden bg-zinc-100 shadow-inner">
                    <img
                      src={venture.imageUrl}
                      alt={venture.name}
                      className="absolute inset-0 w-full h-full object-cover object-center"
                      loading="eager"
                    />
                  </div>

                  {/* Right Column: Venture Details & Offerings */}
                  <div className="lg:col-span-7 flex flex-col justify-between space-y-4 py-1">
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-heading">
                        {venture.category}
                      </span>

                      <h3 className="text-xl sm:text-2xl lg:text-[1.7rem] font-bold text-zinc-900 tracking-tight mt-1 mb-2 font-heading leading-tight">
                        {venture.headline}
                      </h3>

                      <p className="text-xs sm:text-sm text-zinc-500 font-normal leading-relaxed font-sans">
                        {venture.description}
                      </p>
                    </div>

                    {/* Offerings Highlights Row */}
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-100">
                      {venture.offerings.map((item, i) => (
                        <div key={i} className="space-y-0.5">
                          <p className="text-xs sm:text-sm font-bold text-zinc-900 font-heading">
                            {item.label}
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-zinc-400 font-sans font-medium">
                            {item.detail}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Action Button */}
                    <div className="pt-2">
                      <Link
                        to={venture.link}
                        onClick={(e) => {
                          if (!isFront) {
                            e.preventDefault();
                            swapCards(index);
                          }
                        }}
                        className={`inline-flex items-center gap-2.5 px-7 py-3 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 font-heading shadow-md ${
                          isFront
                            ? 'bg-zinc-900 text-white hover:bg-zinc-800 hover:scale-[1.02] active:scale-[0.98]'
                            : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
                        }`}
                      >
                        <span>{isFront ? `Inquire About ${venture.name}` : `View ${venture.name}`}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Minimal Pill Dots Indicator */}
        <div className="flex justify-center items-center gap-2 mt-3.5 sm:mt-4">
          {VENTURES.map((v, i) => (
            <button
              key={v.id}
              onClick={() => swapCards(i)}
              aria-label={`View ${v.name}`}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                activeIndex === i ? 'w-7 bg-zinc-900' : 'w-1.5 bg-zinc-200 hover:bg-zinc-400'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
