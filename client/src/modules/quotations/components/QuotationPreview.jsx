import { useEffect, useRef, useState } from 'react';
import DocumentPreviewSkeleton from '../../../components/ui/DocumentPreviewSkeleton';

const PREVIEW_WIDTH = 794;

export default function QuotationPreview({ html, title, iframeRef, isFetching, error }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [measurement, setMeasurement] = useState({ html: null, height: 1150 });
  const height = measurement.html === html ? measurement.height : 1150;

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return undefined;
    const updateScale = () => {
      const width = element.clientWidth;
      setScale(width > 0 ? Math.min(1, width / PREVIEW_WIDTH) : 1);
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(element);
    return () => observer.disconnect();
  }, [html, isFetching]);

  if (error) {
    return <p role="alert" className="p-8 text-center text-sm text-red-700">Unable to load this quotation preview.</p>;
  }
  if (!html || isFetching) {
    return <DocumentPreviewSkeleton maxWidth={794} />;
  }

  return (
    <div className="flex justify-center bg-zinc-100/50 p-3 sm:p-6 print:p-0">
      <div ref={wrapRef} className="w-full max-w-[794px] overflow-hidden print:max-w-none print:overflow-visible">
        <div className="relative print:h-auto" style={{ height: height * scale }}>
          <iframe
            ref={iframeRef}
            srcDoc={html}
            title={title}
            className="border-0 rounded-lg shadow-sm bg-transparent"
            style={{ width: PREVIEW_WIDTH, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}
            onLoad={(event) => {
              const doc = event.currentTarget.contentDocument;
              setMeasurement({ html, height: Math.max(doc?.body?.scrollHeight || 0, doc?.documentElement?.scrollHeight || 0, 1130) + 25 });
            }}
          />
        </div>
      </div>
    </div>
  );
}
