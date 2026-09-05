import Link from 'next/link';
import StructuredData from './StructuredData';
import {siteUrl} from '@/lib/seo';
export default function Breadcrumbs({items}) {
  return <><nav className="breadcrumbs" aria-label="Breadcrumb"><ol>{items.map((item,i)=><li key={item.path}>{i===items.length-1?<span aria-current="page">{item.name}</span>:<Link href={item.path}>{item.name}</Link>}</li>)}</ol></nav><StructuredData data={{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map((item,i)=>({'@type':'ListItem',position:i+1,name:item.name,item:siteUrl+item.path}))}}/></>;
}
