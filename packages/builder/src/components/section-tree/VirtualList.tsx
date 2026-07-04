import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, type ReactNode } from 'react';

interface VirtualListProps {
  count: number;
  estimateSize?: number;
  children: (index: number) => ReactNode;
}

export function VirtualList({ count, estimateSize = 36, children }: VirtualListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 8,
  });

  if (count <= 50) {
    return <>{Array.from({ length: count }, (_, i) => children(i))}</>;
  }

  return (
    <div ref={parentRef} className="max-h-96 overflow-y-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${item.start}px)`,
            }}
          >
            {children(item.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
