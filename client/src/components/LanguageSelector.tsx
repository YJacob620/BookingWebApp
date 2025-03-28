import React, { useState, useEffect } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
  import {Button} from "@/components/ui/button"
  import i18n from "i18next"

  type language = {[lng:string]: {icn:string, name:string} }
  const lngs:language = {
    'en':{
        icn:'',
        name:'english'
    },
    'he':{
        icn:'',
        name:'hebrew'
    }
  }

  const LanguageSelector:React.FC = () => {
      return(
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button>
                    open
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-8'>
                {Object.keys(lngs).map((lng)=>{
                     const isSelected = i18n.resolvedLanguage === lng
                    return(
                        <DropdownMenuItem key={lng} disabled={isSelected}>
                            
                        </DropdownMenuItem>
                    )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
      )
  }
  
  export default LanguageSelector