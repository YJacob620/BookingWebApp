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
            <DropdownMenuTrigger className='' asChild>
                <Button className="p-0.5">
                    <img src={lngs[langpresent].icn} title={lngs[langpresent].name} alt={langpresent} className='h-8 w-10 max-w-10'/>
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