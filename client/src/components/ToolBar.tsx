import React from "react";
import LanguageSelector from "@/components/LanguageSelector";
const ToolBar: React.FC = () => {
  return (
    <div>
      <div className="box-border flex-none">
        <LanguageSelector />
      </div>
    </div>
  );
};

export default ToolBar;
