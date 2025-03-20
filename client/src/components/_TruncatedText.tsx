import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TruncatedTextProps {
  text: string | null | undefined;
  maxLength?: number;
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  showTooltip?: boolean;
  preserveNewlines?: boolean;
}

/**
 * A component that truncates text and displays the full text in a popover when clicked
 * 
 * @param text - The text to be displayed and potentially truncated
 * @param maxLength - Maximum character length before truncating (default: 30)
 * @param placeholder - Text to display when no content is provided (default: "N/A")
 * @param className - Additional CSS classes for the trigger element
 * @param contentClassName - Additional CSS classes for the popover content
 * @param showTooltip - Whether to show a tooltip on hover (default: true)
 * @param preserveNewlines - Whether to preserve newlines in the full text display (default: true)
 */
const TruncatedText: React.FC<TruncatedTextProps> = ({
  text,
  maxLength = 30,
  placeholder = "N/A",
  className = "",
  contentClassName = "",
  showTooltip = true,
  preserveNewlines = true
}) => {
  // Clean up the input text
  const content = text?.trim() || "";
  const hasContent = content.length > 0;
  const needsTruncation = hasContent && content.length > maxLength;

  // Check for RTL text (Hebrew, Arabic, etc.)
  const isRTL = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(content);

  // Format the text to preserve newlines if specified
  const formatText = (text: string) => {
    if (!preserveNewlines) return text;

    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  // If no content, just display the placeholder
  if (!hasContent) {
    return <span>{placeholder}</span>;
  }

  // If the content is short enough, just display it
  if (!needsTruncation) {
    return (
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className={className}
      >
        {formatText(content)}
      </div>
    );
  }

  // If the content needs truncation, use a popover
  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      <Popover>
        <PopoverTrigger asChild>
          <div
            className={`w-full cursor-pointer hover:text-blue-500 ${className}`}
            title={showTooltip ? "Click to view full text" : undefined}
          >
            {content.substring(0, maxLength) + "..."}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className={`w-100 max-h-60 overflow-auto bg-gray-900 ${contentClassName}`}
          dir={isRTL ? "rtl" : "ltr"}
        >
          <div className="text-sm whitespace-pre-wrap">
            {formatText(content)}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TruncatedText;