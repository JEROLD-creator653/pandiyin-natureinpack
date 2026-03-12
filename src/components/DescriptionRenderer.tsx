import DOMPurify from 'dompurify';

interface DescriptionRendererProps {
  content: string;
  className?: string;
}

export const DescriptionRenderer = ({ 
  content, 
  className = '' 
}: DescriptionRendererProps) => {
  if (!content) {
    return <div className={className}>No description available</div>;
  }

  // Sanitize the HTML content to prevent XSS attacks
  const sanitizedHTML = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'span', 'div',
      'hr', 'a', 'img'
    ],
    ALLOWED_ATTR: ['class', 'href', 'target', 'rel', 'src', 'alt'],
    ALLOW_DATA_ATTR: false,
  });

  // Quill inserts &nbsp; (non-breaking spaces) between words/spans.
  // The browser treats text joined by &nbsp; as a single unbreakable word,
  // causing mid-word breaks when overflow-wrap kicks in.
  // Replace &nbsp; with regular spaces so words wrap at natural boundaries.
  const normalizedHTML = sanitizedHTML
    .replace(/&nbsp;/g, ' ')
    .replace(/\u00A0/g, ' ');

  return (
    <div className="w-full min-w-0">
      <div 
        className={`product-description max-w-none ${className}`}
        dangerouslySetInnerHTML={{ __html: normalizedHTML }}
      />
    </div>
  );
};

export default DescriptionRenderer;
