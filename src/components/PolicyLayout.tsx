import { useEffect, useMemo } from 'react';
import { memo } from 'react';
import { motion } from 'framer-motion';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import SEOHead from '@/components/SEOHead';

interface PolicyLayoutProps {
  title: string;
  lastUpdated: string;
  content: string;
}

function PolicyLayout({ title, lastUpdated, content }: PolicyLayoutProps) {
  const { data: store } = useStoreSettings();
  
  // Substitute {{EMAIL}}, {{PHONE}}, {{ADDRESS}} placeholders with actual store settings
  const resolvedContent = useMemo(() => {
    return content
      .replace(/\{\{EMAIL\}\}/g, store?.email || '—')
      .replace(/\{\{PHONE\}\}/g, store?.phone || '—')
      .replace(/\{\{ADDRESS\}\}/g, store?.address || '—');
  }, [content, store]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [title]);

  // Memoize content formatting to avoid recalculation
  const formattedSections = useMemo(() => {
    const sections = resolvedContent.split('\n\n').map((section, index) => {
      const lines = section.split('\n');
      const firstLine = lines[0];
      const isHeading = /^\d+\.|^[A-Z]/.test(firstLine) && !firstLine.includes('.');
      const isMainTitle = index === 0 && firstLine === title;
      
      if (isMainTitle) return null;

      return (
        <div key={index} className="mb-6">
          {isHeading && /^\d+\./.test(firstLine) ? (
            <>
              <h2 className="text-xl font-bold mb-3 text-foreground">
                {firstLine}
              </h2>
              {lines.slice(1).map((line, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground mb-2">
                  {line}
                </p>
              ))}
            </>
          ) : /^[A-Z]\)/.test(firstLine) ? (
            <>
              <h3 className="font-semibold text-base mb-2 text-foreground">
                {firstLine}
              </h3>
              {lines.slice(1).map((line, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground mb-2">
                  {line}
                </p>
              ))}
            </>
          ) : lines[0].startsWith('-') ? (
            <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
              {lines.map((line, i) => (
                <li key={i} className="ml-2">
                  {line.replace(/^-\s*/, '')}
                </li>
              ))}
            </ul>
          ) : (
            <>
              {lines.map((line, i) => (
                line.trim() && (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground mb-2">
                    {line}
                  </p>
                )
              ))}
            </>
          )}
        </div>
      );
    });

    return sections.filter(Boolean);
  }, [resolvedContent, title]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background pt-28 pb-16"
    >
      <SEOHead title={title} description={`${title} for PANDIYIN Nature In Pack - Authentic homemade foods from Madurai.`} />
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Last Updated: {lastUpdated}
          </p>
        </div>

          {/* Content */}
          <div className="prose prose-sm max-w-none prose-a:text-primary prose-a:underline">
          {formattedSections}
        </div>

        {/* Contact Section */}
        <div className="mt-16 pt-8 border-t border-border">
          <h3 className="text-lg font-bold mb-4 text-foreground">Have Questions?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            If you have any questions about this policy, please contact us:
          </p>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Email:</strong> {store?.email || '—'}
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Phone:</strong> {store?.phone || '—'}
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Address:</strong> {store?.address || '—'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(PolicyLayout);
