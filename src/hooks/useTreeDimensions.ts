import { useEffect, useState, RefObject } from 'react';

interface TreeDimensions {
  width: number;
  height: number;
}

export function useTreeDimensions(containerRef: RefObject<HTMLDivElement>) {
  const [containerDimensions, setContainerDimensions] = useState<TreeDimensions>({ 
    width: 400, 
    height: 600 
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Account for padding (8px on all sides = 16px total)
        setContainerDimensions({ 
          width: Math.max(width - 16, 200), 
          height: Math.max(height - 16, 400) 
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  return containerDimensions;
}