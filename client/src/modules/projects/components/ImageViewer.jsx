import { useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';
import { useState } from 'react';

export default function ImageViewer({ image, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.25, 3));
      if (e.key === '-') setZoom((z) => Math.max(z - 0.25, 0.25));
      if (e.key === 'r') setRotation((r) => r + 90);
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10">
        <X className="w-5 h-5" />
      </button>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/10 rounded-lg p-1 z-10">
        <button onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
          className="p-1.5 rounded hover:bg-white/20 text-white transition-colors">
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-xs text-white/80 min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))}
          className="p-1.5 rounded hover:bg-white/20 text-white transition-colors">
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-white/20 mx-1" />
        <button onClick={() => setRotation((r) => r + 90)}
          className="p-1.5 rounded hover:bg-white/20 text-white transition-colors">
          <RotateCw className="w-4 h-4" />
        </button>
        <button onClick={() => window.open(image.url, '_blank')}
          className="p-1.5 rounded hover:bg-white/20 text-white transition-colors">
          <Download className="w-4 h-4" />
        </button>
      </div>

      <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img src={image.url} alt={image.name || 'Image'}
          className="max-w-full max-h-full object-contain transition-transform duration-100 select-none"
          style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          draggable={false} />
      </div>
    </div>
  );
}
