
import React from "react";
import ReactMarkdown from "react-markdown";
import { Card } from "@/app/components/ui/card";

interface ContentBlock {
  type: string;
  level?: number;
  content: string;
  url?: string;
  alt?: string;
}

interface PostContentProps {
  content: ContentBlock[] | any;
}

export const PostContent: React.FC<PostContentProps> = ({ content }) => {
  // Function to render content based on the content blocks
  const renderContent = (contentBlocks: any[]) => {
    return contentBlocks.map((block, index) => {
      if (block.type === "heading") {
        const level = block.level || 2;
        if (level === 1) return <h1 key={index} className="my-4">{block.content}</h1>;
        if (level === 2) return <h2 key={index} className="my-4">{block.content}</h2>;
        if (level === 3) return <h3 key={index} className="my-4">{block.content}</h3>;
        if (level === 4) return <h4 key={index} className="my-4">{block.content}</h4>;
        if (level === 5) return <h5 key={index} className="my-4">{block.content}</h5>;
        return <h6 key={index} className="my-4">{block.content}</h6>;
      } else if (block.type === "paragraph") {
        return (
          <div key={index} className="my-4">
            <ReactMarkdown>{block.content}</ReactMarkdown>
          </div>
        );
      } else if (block.type === "image" && block.url) {
        return (
          <figure key={index} className="my-6">
            <img
              src={block.url}
              alt={block.alt || ""}
              className="w-full rounded object-cover mb-2"
            />
            {block.alt && (
              <figcaption className="text-sm text-center text-gray-500">{block.alt}</figcaption>
            )}
          </figure>
        );
      }
      return null;
    });
  };

  return (
    <Card>
      <div className="p-6">
        {Array.isArray(content) ? (
          renderContent(content)
        ) : (
          <div className="prose max-w-none">
            {typeof content === 'object' && content !== null ? 
              renderContent(Object.values(content)) : 
              <p>{String(content)}</p>
            }
          </div>
        )}
      </div>
    </Card>
  );
};
