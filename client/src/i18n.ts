import i18n from "i18next"
import { initReactI18next } from 'react-i18next'
import Backend from 'i18next-http-backend'
import resourcesToBackend from 'i18next-resources-to-backend';

const isDev = import.meta.env.DEV

i18n
.use(initReactI18next)
.use(resourcesToBackend((language: any, namespace: any) => import(`./locales/${language}/${namespace}.json`)))
.init({
    debug: isDev, // Enable logging for development
    fallbackLng: 'en', // Default language
    saveMissing: isDev, // you should not use saveMissing in production
})