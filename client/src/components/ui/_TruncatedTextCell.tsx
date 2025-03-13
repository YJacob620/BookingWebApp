import React from 'react';
import { TableCell } from "@/components/ui/table";
import TruncatedText from './_TruncatedText';

interface TruncatedTextCellProps {
  text: string | null | undefined;
  maxLength?: number;
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  cellClassName?: string;
  preserveNewlines?: boolean;
}

/**
 * A table cell component that displays truncated text with a popover for the full content
 * 
 * @param text - The text to be displayed and potentially truncated
 * @param maxLength - Maximum character length before truncating (default: 30)
 * @param placeholder - Text to display when no content is provided (default: "N/A")
 * @param className - Additional CSS classes for the trigger element
 * @param contentClassName - Additional CSS classes for the popover content
 * @param cellClassName - Additional CSS classes for the table cell
 * @param preserveNewlines - Whether to preserve newlines in the full text display (default: true)
 */
const TruncatedTextCell: React.FC<TruncatedTextCellProps> = ({
  text,
  maxLength = 30,
  placeholder = "N/A",
  className = "",
  contentClassName = "",
  cellClassName = "",
  preserveNewlines = true
}) => {
  // Check for RTL text (Hebrew, Arabic, etc.)
  const isRTL = text ? /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text) : false;

  return (
    <TableCell
      dir={isRTL ? "rtl" : "ltr"}
      className={`relative ${cellClassName}`}
    >
      <TruncatedText
        text={text}
        maxLength={maxLength}
        placeholder={placeholder}
        className={className}
        contentClassName={contentClassName}
        preserveNewlines={preserveNewlines}
      />
    </TableCell>
  );
};

export default TruncatedTextCell;
