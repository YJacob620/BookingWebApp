import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

import {
    FilterOption,
} from '@/utils';
import { useTranslation } from 'react-i18next';

interface MultiSelectFilterProps {
    options: FilterOption<string>[];
    selectedValues: string[];
    onSelectionChange: (values: string[]) => void;
    label: string;
    triggerClassName?: string;
    popoverWidth?: string;
    placeholder?: string;
    variant?: 'checked' | 'badge';
    disabled?: boolean;
}

/**
 * A reusable multi-select filter component with checkboxes
 * 
 * @param options - List of available filter options
 * @param selectedValues - Currently selected values
 * @param onSelectionChange - Callback when selection changes
 * @param label - Label for the filter
 * @param triggerClassName - Optional class name for the trigger button
 * @param popoverWidth - Optional width for the popover
 * @param placeholder - Optional placeholder text when nothing is selected
 * @param variant - Display variant ('checked' shows checkboxes only, 'badge' shows colored badges)
 */
const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
    options,
    selectedValues,
    onSelectionChange,
    label,
    triggerClassName = "",
    popoverWidth = "w-60",
    placeholder = "All",
    variant = 'checked',
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const { t, i18n } = useTranslation()

    // Toggle selection of an option
    const toggleOption = (value: string) => {
        if (selectedValues.includes(value)) {
            // Remove value if already selected
            onSelectionChange(selectedValues.filter(val => val !== value));
        } else {
            // Add value if not selected
            onSelectionChange([...selectedValues, value]);
        }
    };

    // Clear all selections
    const clearAll = () => {
        onSelectionChange([]);
    };

    // Select all options
    const selectAll = () => {
        onSelectionChange(options.map(option => option.value));
    };

    // Get display text for the trigger button
    const getDisplayText = () => {
        if (selectedValues.length === 0) {
            return placeholder;
        }

        if (selectedValues.length === options.length) {
            return t("All");
        }

        if (selectedValues.length <= 2) {
            // Show the labels of selected options
            return selectedValues
                .map(value => {
                    const label = options.find(opt => opt.value === value)?.label;
                    return label ? t(label) : value;
                })
                .join(", ");
        }

        // Show count if more than 2 items selected
        return `${selectedValues.length} ${t("selected")}`;
    };

    return (
        <div className="flex flex-col">
            <p>{label}</p>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={`!text-sm ps-2 justify-start h-10 ${triggerClassName} 
                        bg-gray-700 border-gray-600 text-gray-200 text-md font-normal`}
                        aria-label={`Filter by ${label.toLowerCase()}`}
                        disabled={disabled}
                        dir={i18n.dir()}
                    >
                        <span className="truncate" dir='auto'>{getDisplayText()}</span>
                        {selectedValues.length > 0 && (
                            <Badge
                                variant="secondary"
                                className="ml-2 font-normal"
                            >
                                {selectedValues.length}
                            </Badge>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className={`${popoverWidth} p-0 bg-gray-900 max-w-50`} align="center">
                    <div className="p-2 border-b border-gray-700 flex justify-between items-center" dir={i18n.dir()}>
                        <div className="flex space-x-1">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={selectAll}
                            >
                                {t('Select All')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={clearAll}
                                disabled={selectedValues.length === 0}
                            >
                                {t('Clear')}
                            </Button>
                        </div>
                    </div>
                    <div className="py-2 overflow-auto">
                        {options.map((option) => {
                            const isSelected = selectedValues.includes(option.value);
                            return (
                                <div
                                    key={option.value}
                                    className="px-2 py-1.5 hover:bg-gray-700 cursor-pointer"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleOption(option.value);
                                    }}
                                >
                                    <div className="flex items-center">
                                        <Checkbox
                                            id={`filter-${label}-${option.value}`}
                                            checked={isSelected}
                                            className="me-2 checkbox1 h-4 w-4"
                                        />

                                        {variant === 'badge' && option.color ? (
                                            <div className="flex-1" dir='auto'>
                                                <Badge className={option.color}>{t(option.label)}</Badge>
                                            </div>
                                        ) : (
                                            <span className="flex-1 text-sm font-normal" dir='auto'>
                                                {t(option.label)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
};

export default MultiSelectFilter;