import {services} from '@/lib/data';
export default function sitemap(){const base='https://jovamedia.com';const pages=['','/services','/work','/work/brand-direction','/work/editorial-experience','/about','/contact','/insights','/privacy-policy','/terms'];return [...pages.map(path=>({url:base+path})),...services.map(service=>({url:`${base}/services/${service.slug}`}))]}
