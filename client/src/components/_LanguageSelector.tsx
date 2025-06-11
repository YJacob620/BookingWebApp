import React, { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import i18n from "i18next"
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check } from 'lucide-react';
import icn_en from '@/components/icons/EnglishLanguage_Flag1_26107.png'
import icn_he from './icons/israelflag_6498.png'

type language = { [lng: string]: { icn: string, name: string } }
const lngs: language = {
    'en': {
        icn: icn_en,
        name: 'English'
    },
    'he': {
        icn: icn_he,
        name: 'עברית'
    }
}

const LanguageSelector: React.FC = () => {
    const [langpresent, setlangpresent] = useState(i18n.language)
    const { t } = useTranslation()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="custom1"
                    className="flex items-center gap-2 px-3 py-2 h-10 w-30"
                >
                    <div className="flex items-center gap-2">
                        <img
                            src={lngs[langpresent].icn}
                            title={lngs[langpresent].name}
                            alt={langpresent}
                            className='h-5 w-7 rounded-sm object-cover'
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {lngs[langpresent].name}
                        </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                className="
                    w-48 p-1
                    bg-white/95 backdrop-blur-md
                    border border-gray-200 rounded-xl shadow-lg
                    dark:bg-gray-800/95 dark:border-gray-700
                    animate-in fade-in-0 zoom-in-95 duration-200
                "
                align="end"
            >
                <DropdownMenuLabel className="
                    px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide
                    dark:text-gray-400
                ">
                    {t('language')}
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="my-1 bg-gray-200 dark:bg-gray-700" />

                {Object.keys(lngs).map((lng) => {
                    const isSelected = i18n.resolvedLanguage === lng
                    return (
                        <DropdownMenuItem
                            key={lng}
                            className={`
                                flex items-center justify-between px-3 py-2.5 mx-1 rounded-lg
                                cursor-pointer transition-all duration-150
                                ${isSelected
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                }
                                focus:bg-gray-100 dark:focus:bg-gray-700/50
                                ${isSelected ? 'cursor-default' : ''}
                            `}
                            disabled={isSelected}
                            onSelect={() => {
                                if (!isSelected) {
                                    setlangpresent(lng)
                                    i18n.changeLanguage(lng)
                                }
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <img
                                    src={lngs[lng].icn}
                                    alt={lng}
                                    className="h-4 w-6 rounded-sm object-cover border border-gray-200 dark:border-gray-600"
                                />
                                <span className={`
                                    text-sm font-medium
                                    ${isSelected
                                        ? 'text-blue-700 dark:text-blue-300'
                                        : 'text-gray-700 dark:text-gray-300'
                                    }
                                `}>
                                    {lngs[lng].name}
                                </span>
                            </div>

                            {isSelected && (
                                <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            )}
                        </DropdownMenuItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default LanguageSelector