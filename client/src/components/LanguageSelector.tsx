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

type language = { [lng: string]: { icn: string, name: string } }
const lngs: language = {
    'en': {
        icn: '',
        name: 'English'
    },
    'he': {
        icn: '',
        name: 'עברית'
    }
}

const LanguageSelector: React.FC = () => {
    const [langpresent, setlangpresent] = useState(i18n.language)
    const { t } = useTranslation()
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className='w-10 h-8 !ring-0' asChild>
                <Button className="bg-gray-600 border-gray-500">
                    {langpresent}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-8 text-center'>
                <DropdownMenuLabel className='font-semibold'>{t('language')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.keys(lngs).map((lng) => {
                    const isSelected = i18n.resolvedLanguage === lng
                    return (
                        <DropdownMenuItem
                            key={lng}
                            disabled={isSelected}
                            className='justify-center'
                            onSelect={() => {
                                setlangpresent(lng)
                                i18n.changeLanguage(lng)
                            }}>
                            {lngs[lng].name}
                        </DropdownMenuItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default LanguageSelector