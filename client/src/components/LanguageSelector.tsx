import React, { useState } from 'react';
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
import i18next from 'i18next';

  type language = {[lng:string]: {icn:string, name:string} }
  const lngs:language = {
    'en':{
        icn:'',
        name:'english'
    },
    'he':{
        icn:'',
        name:'עברית'
    }
  }

  const LanguageSelector:React.FC = () => {
    const [langpresent,setlangpresent] = useState(i18next.language)
    // const chooselanghandler = (key:Event)=>{
    //     setlangpresent(lngs[key.currentTarget.value].name)
    // }
      return(
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className='h-8 w-4 mr-2'>
                {langpresent}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-8'>
                <DropdownMenuLabel>language</DropdownMenuLabel>
                <DropdownMenuSeparator/>
                {Object.keys(lngs).map((lng)=>{
                     const isSelected = i18n.resolvedLanguage === lng
                    return(
                        <DropdownMenuItem key={lng} disabled={isSelected} 
                        onSelect={()=>{
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