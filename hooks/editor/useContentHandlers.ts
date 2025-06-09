
import { useState } from "react";
import { EditorContent } from "@/app/components/blog/editor/types";
import { ContentHandlers } from "./types";
import { useImageHandlers } from "./useImageHandlers";

export function useContentHandlers(
  initialContent: EditorContent[] = [{ type: "paragraph", content: "" }]
): [EditorContent[], number, React.Dispatch<React.SetStateAction<number>>, ContentHandlers] {
  const [content, setContent] = useState<EditorContent[]>(initialContent);
  const [currentEditingIndex, setCurrentEditingIndex] = useState(0);
  const { deleteImage } = useImageHandlers();

  const handleContentChange = (index: number, value: string) => {
    const newContent = [...content];
    newContent[index] = { ...newContent[index], content: value };
    setContent(newContent);
  };

  const addContentBlock = (type: EditorContent["type"], index: number) => {
    const newBlock: EditorContent = { type, content: "" };
    const newContent = [...content];
    newContent.splice(index + 1, 0, newBlock);
    setContent(newContent);
    setCurrentEditingIndex(index + 1);
  };

  const moveContentBlock = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === content.length - 1)
    ) {
      return;
    }

    const newContent = [...content];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    
    const temp = newContent[index];
    newContent[index] = newContent[newIndex];
    newContent[newIndex] = temp;
    
    setContent(newContent);
    setCurrentEditingIndex(newIndex);
  };

  const deleteContentBlock = async (index: number) => {
    if (content.length === 1) {
      return;
    }
    
    // If we're deleting an image, delete it from storage first
    if (content[index].type === "image" && content[index].url) {
      await deleteImage(content[index].url);
    }
    
    const newContent = [...content];
    newContent.splice(index, 1);
    setContent(newContent);
    setCurrentEditingIndex(Math.min(index, newContent.length - 1));
  };

  const handleBlockTypeChange = (index: number, type: "paragraph" | "heading", level?: 1 | 2) => {
    const newContent = [...content];
    newContent[index] = { 
      ...newContent[index], 
      type, 
      level: type === "heading" ? level : undefined 
    };
    setContent(newContent);
  };

  const handleAltTextChange = (index: number, value: string) => {
    const newContent = [...content];
    newContent[index] = { ...newContent[index], alt: value };
    setContent(newContent);
  };

  const handleTextGenerated = (generatedText: string, index: number) => {
    const newContent = [...content];
    newContent[index] = { ...newContent[index], content: generatedText };
    setContent(newContent);
  };

  const handlers: ContentHandlers = {
    handleContentChange,
    addContentBlock,
    moveContentBlock,
    deleteContentBlock,
    handleBlockTypeChange,
    handleAltTextChange,
    handleTextGenerated
  };

  return [content, currentEditingIndex, setCurrentEditingIndex, handlers];
}
