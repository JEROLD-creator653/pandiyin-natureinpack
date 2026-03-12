import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DescriptionRenderer from './DescriptionRenderer';

interface ProductDescriptionCollapsibleProps {
  content: string;
  imageHeight?: number;
  className?: string;
}

export default function ProductDescriptionCollapsible({
  content,
  imageHeight = 400,
  className = 'text-muted-foreground',
}: ProductDescriptionCollapsibleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldCollapse, setShouldCollapse] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fullHeight, setFullHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setFullHeight(height);
      // Only show read more if content exceeds image height
      setShouldCollapse(height > imageHeight);
    }
  }, [content, imageHeight]);

  const collapsedHeight = Math.min(imageHeight, fullHeight);

  return (
    <div className="flex flex-col min-w-0 w-full">
      {/* Description Content - smooth max-height animation */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${className}`}
        style={{
          maxHeight: isExpanded ? fullHeight + 24 : collapsedHeight,
        }}
      >
        <div ref={contentRef} className="pb-4">
          <DescriptionRenderer content={content} className="prose prose-sm max-w-none" />
        </div>
      </div>

      {/* Fade gradient overlay when collapsed */}
      {shouldCollapse && !isExpanded && (
        <div className="h-16 bg-gradient-to-t from-background via-background/70 to-transparent pointer-events-none -mt-16" />
      )}

      {/* Read More / Show Less Button - Centered with Arrow */}
      {shouldCollapse && (
        <div className="flex justify-center pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-2 text-primary hover:text-primary/80 hover:bg-primary/10 transition-colors"
          >
            {isExpanded ? (
              <>
                Show less
                <ChevronDown className="h-4 w-4 rotate-180 transition-transform duration-300" />
              </>
            ) : (
              <>
                Read more
                <ChevronDown className="h-4 w-4 transition-transform duration-300" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
