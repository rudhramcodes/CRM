import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, RotateCcw, Move } from 'lucide-react';

export default function ImageViewer({ image, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const reset = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.25, 5)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.25, 0.25)), []);
  const rotateCw = useCallback(() => setRotation((r) => r + 90), []);
  const rotateCcw = useCallback(() => setRotation((r) => r - 90), []);

  const handleDownload = useCallback(async (e) => {
    e.stopPropagation();
    try {
      const res = await fetch(image.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.name || 'image';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      const a = document.createElement('a');
      a.href = image.url;
      a.download = image.name || 'image';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [image.url, image.name]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
      if (e.key === 'r') rotateCw();
      if (e.key === 'R') rotateCcw();
      if (e.key === '0') reset();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose, zoomIn, zoomOut, rotateCw, rotateCcw, reset]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e) => {
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoomIn, zoomOut]);

  const handleMouseDown = useCallback((e) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [zoom, position]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleTouchStart = useCallback((e) => {
    if (zoom <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  }, [zoom, position]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const isZoomed = zoom > 1;
  const isRotated = rotation % 360 !== 0;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-20 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all duration-200 hover:scale-110 active:scale-90 border border-white/10 hover:border-white/20"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      <div
        className="absolute top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 px-2 py-1.5 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <ToolBtn onClick={zoomOut} label="Zoom out (-)" disabled={zoom <= 0.25}>
          <ZoomOut className="w-4 h-4" />
        </ToolBtn>

        <span className="text-xs text-white/60 min-w-[52px] text-center font-mono tabular-nums select-none">
          {Math.round(zoom * 100)}%
        </span>

        <ToolBtn onClick={zoomIn} label="Zoom in (+)" disabled={zoom >= 5}>
          <ZoomIn className="w-4 h-4" />
        </ToolBtn>

        <Sep />

        <ToolBtn onClick={rotateCcw} label="Rotate left (Shift+R)">
          <RotateCcw className="w-4 h-4" />
        </ToolBtn>

        <ToolBtn onClick={rotateCw} label="Rotate right (R)">
          <RotateCw className="w-4 h-4" />
        </ToolBtn>

        <Sep />

        <ToolBtn onClick={reset} label="Reset (0)" disabled={!isZoomed && !isRotated && position.x === 0 && position.y === 0}>
          <span className="text-xs font-medium">1:1</span>
        </ToolBtn>

        <Sep />

        <ToolBtn onClick={handleDownload} label="Download" accent>
          <Download className="w-4 h-4" />
        </ToolBtn>
      </div>

      {isZoomed && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-white/50 bg-black/40 backdrop-blur-xl border border-white/10">
          <Move className="w-3.5 h-3.5" />
          Drag to pan
        </div>
      )}

      {image.name && (
        <div
          className="absolute bottom-5 right-5 z-20 px-3 py-1.5 rounded-lg text-xs text-white/50 max-w-[200px] truncate bg-black/40 backdrop-blur-xl border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {image.name}
        </div>
      )}

      <div
        className="flex items-center justify-center select-none"
        style={{ cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={image.url}
          alt={image.name || 'Image'}
          draggable={false}
          className="max-w-[90vw] max-h-[85vh] object-contain"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            willChange: 'transform',
          }}
        />
      </div>
    </div>
  );
}

function ToolBtn({ onClick, label, disabled, accent, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`p-2 rounded-xl transition-all duration-150 active:scale-90 disabled:opacity-25 disabled:cursor-not-allowed ${
        accent
          ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/20'
          : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-white/10 mx-0.5" />;
}
