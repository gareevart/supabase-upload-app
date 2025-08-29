"use client";

import Image from 'next/image';
import React from 'react';
import GeneratedImageDisplay from './components/GeneratedImageDisplay';

interface TipTapRendererProps {
  content: string;
}

const TipTapRenderer: React.FC<TipTapRendererProps> = ({ content }) => {
  const renderNode = (node: any, index: string | number): React.ReactNode => {
    if (!node) return null;

    // Handle text nodes
    if (node.type === 'text') {
      let text = node.text || '';
      let element: React.ReactNode = text;
      
      // Apply marks if present
      if (node.marks && node.marks.length > 0) {
        node.marks.forEach((mark: any) => {
          switch (mark.type) {
            case 'bold':
              element = <strong key={`bold-${index}`}>{element}</strong>;
              break;
            case 'italic':
              element = <em key={`italic-${index}`}>{element}</em>;
              break;
            case 'underline':
              element = <u key={`underline-${index}`}>{element}</u>;
              break;
            case 'strike':
              element = <s key={`strike-${index}`}>{element}</s>;
              break;
            case 'code':
              element = <code key={`code-${index}`}>{element}</code>;
              break;
            case 'link':
              element = (
                <a 
                  key={`link-${index}`}
                  href={mark.attrs?.href || '#'} 
                  target={mark.attrs?.target || undefined}
                >
                  {element}
                </a>
              );
              break;
          }
        });
      }
      
      return element;
    }

    // Handle block nodes
    const children = node.content ? node.content.map((child: any, childIndex: number) =>
      renderNode(child, `${index}-${childIndex}`)
    ) : [];

    switch (node.type) {
      case 'doc':
        return <div key={`doc-${index}`}>{children}</div>;
        
      case 'paragraph':
        // Check if this paragraph contains ONLY one image child (regular image or resizable)
        const isParagraphWithSingleImage = node.content &&
          node.content.length === 1 &&
          (node.content[0].type === 'image' || node.content[0].type === 'resizableImage');

        if (isParagraphWithSingleImage) {
          // If paragraph contains only an image, don't wrap in <p> tag to avoid DOM nesting error
          return <div key={`paragraph-${index}`}>{children}</div>;
        }

        return (
          <p
            key={`paragraph-${index}`}
            style={node.attrs?.textAlign ? { textAlign: node.attrs.textAlign } : undefined}
          >
            {children}
          </p>
        );
        
      case 'heading':
        const level = node.attrs?.level || 1;
        const headingStyle = node.attrs?.textAlign ? { textAlign: node.attrs.textAlign } : undefined;
        
        switch (level) {
          case 1:
            return <h1 key={`heading-${index}`} style={headingStyle}>{children}</h1>;
          case 2:
            return <h2 key={`heading-${index}`} style={headingStyle}>{children}</h2>;
          case 3:
            return <h3 key={`heading-${index}`} style={headingStyle}>{children}</h3>;
          case 4:
            return <h4 key={`heading-${index}`} style={headingStyle}>{children}</h4>;
          case 5:
            return <h5 key={`heading-${index}`} style={headingStyle}>{children}</h5>;
          case 6:
            return <h6 key={`heading-${index}`} style={headingStyle}>{children}</h6>;
          default:
            return <h1 key={`heading-${index}`} style={headingStyle}>{children}</h1>;
        }
        
      case 'bulletList':
        return <ul key={`bulletList-${index}`}>{children}</ul>;
        
      case 'orderedList':
        return <ol key={`orderedList-${index}`}>{children}</ol>;
        
      case 'listItem':
        return <li key={index.toString()}>{children}</li>;
        
      case 'blockquote':
        return <blockquote key={`blockquote-${index}`}>{children}</blockquote>;
        
      case 'codeBlock':
        const language = node.attrs?.language || '';
        return (
          <pre key={`codeBlock-${index}`}>
            <code className={language ? `language-${language}` : undefined}>
              {children}
            </code>
          </pre>
        );
        
      case 'image':
        // For images, we'll use Next.js Image component for optimization
        const src = node.attrs?.src || '';
        const alt = node.attrs?.alt || '';
        const title = node.attrs?.title || '';
        
        // If it's a local image (relative path), we can't use Next.js Image optimization
        // In that case, we'll use Next.js Image with unoptimized prop
        if (src.startsWith('/') || src.startsWith('./') || src.startsWith('../')) {
          return (
            <div style={{ position: 'relative', width: '100%', height: 'auto' }}>
              <Image
                key={`image-${index}`}
                src={src}
                alt={alt}
                title={title}
                width={0}
                height={0}
                unoptimized
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
          );
        }
        
        // For external images, use Next.js Image component
        return (
          <div style={{ position: 'relative', width: '100%', height: 'auto' }}>
            <Image
              key={`image-${index}`}
              src={src}
              alt={alt}
              title={title}
              width={0}
              height={0}
              style={{ width: '100%', height: 'auto' }}
              sizes="100vw"
            />
          </div>
        );

      case 'resizableImage':
        // Handle resizableImage with size attributes
        const resizableSrc = node.attrs?.src || '';
        const resizableAlt = node.attrs?.alt || '';
        const resizableTitle = node.attrs?.title || '';
        const resizableWidth = node.attrs?.width;
        const resizableHeight = node.attrs?.height;
        const resizableAlignment = node.attrs?.['data-alignment'] || 'center';

        const imageStyle: any = {};
        if (resizableWidth) {
          imageStyle.width = resizableWidth;
        }
        if (resizableHeight) {
          imageStyle.height = resizableHeight;
        }

        const containerStyle: any = {};
        containerStyle.textAlign = resizableAlignment;
        containerStyle.display = 'block';
        containerStyle.margin = '1rem 0';

        if (resizableSrc.startsWith('/') || resizableSrc.startsWith('./') || resizableSrc.startsWith('../')) {
          return (
            <div key={`resizable-image-${index}`} style={containerStyle}>
              <div style={{ position: 'relative', width: '100%', height: 'auto' }}>
                <Image
                  src={resizableSrc}
                  alt={resizableAlt}
                  title={resizableTitle}
                  width={0}
                  height={0}
                  unoptimized
                  style={{ ...imageStyle, maxWidth: '100%', height: 'auto' }}
                />
              </div>
            </div>
          );
        }

        // For external images
        return (
          <div key={`resizable-image-${index}`} style={containerStyle}>
            <div style={{ position: 'relative', width: '100%', height: 'auto' }}>
              <Image
                src={resizableSrc}
                alt={resizableAlt}
                title={resizableTitle}
                width={0}
                height={0}
                style={{ ...imageStyle, maxWidth: '100%', height: 'auto' }}
                sizes="100vw"
              />
            </div>
          </div>
        );

      case 'hardBreak':
        return <br key={`hardBreak-${index}`} />;
        
      case 'imageGenerator':
        const prompt = node.attrs?.prompt || '';
        const generatedImageUrl = node.attrs?.generatedImageUrl || '';
        
        if (generatedImageUrl && prompt) {
          return (
            <GeneratedImageDisplay
              key={`imageGenerator-${index}`}
              prompt={prompt}
              imageUrl={generatedImageUrl}
            />
          );
        }
        return null;
        
      default:
        // For unknown types, render children
        return <div key={`unknown-${index}`}>{children}</div>;
    }
  };

  try {
    const parsedContent = JSON.parse(content);
    return <div className="tiptap-renderer">{renderNode(parsedContent, "root")}</div>;
  } catch (error) {
    console.error("Error parsing TipTap content:", error);
    return <p>Error rendering content</p>;
  }
};

export default TipTapRenderer;
