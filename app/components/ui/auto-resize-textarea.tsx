
import * as React from "react";
import { cn } from "@/lib/utils";
import { Textarea, TextareaProps } from "@/app/components/ui/textarea";
import { useMergedRefs } from "@/lib/react-utils";

export interface AutoResizeTextareaProps extends TextareaProps {}

const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ className, onChange, value, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    // Use the imported useMergedRefs instead of accessing it through React
    const mergedRef = useMergedRefs(ref, textareaRef);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (onChange) onChange(e);
      adjustHeight();
    };

    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set the height to match content
      textarea.style.height = `${textarea.scrollHeight}px`;
    }, []);

    // Adjust height on value change
    React.useEffect(() => {
      adjustHeight();
    }, [value, adjustHeight]);

    // Adjust height on window resize
    React.useEffect(() => {
      const handleResize = () => adjustHeight();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [adjustHeight]);

    // Initial height adjustment
    React.useEffect(() => {
      adjustHeight();
    }, [adjustHeight]);

    return (
      <Textarea
        ref={mergedRef}
        className={cn("overflow-hidden min-h-[80px]", className)}
        onChange={handleChange}
        value={value}
        {...props}
      />
    );
  }
);

AutoResizeTextarea.displayName = "AutoResizeTextarea";

export { AutoResizeTextarea };
