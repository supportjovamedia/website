import {notFound} from 'next/navigation';
import {bookingIndustries} from '@/lib/jovabook-industries.mjs';
import {pageMetadata} from '@/lib/seo';
import BookingIndustryLanding from '@/components/BookingIndustryLanding';

export const dynamicParams=false;
export function generateStaticParams(){return bookingIndustries.map(item=>({industry:item.slug}));}
export async function generateMetadata({params}){
 const {industry}=await params,item=bookingIndustries.find(x=>x.slug===industry);
 if(!item)return {};
 const metadata=pageMetadata('/industries/'+industry,item.searchTitle,item.description||item.intro);
 const title=item.searchTitle+' | JovaBook';
 return {...metadata,title:{absolute:title},openGraph:{...metadata.openGraph,title},twitter:{...metadata.twitter,title}};
}
export default async function IndustryPage({params}){
 const {industry}=await params,item=bookingIndustries.find(x=>x.slug===industry);
 if(!item)notFound();
 return <BookingIndustryLanding item={item} path={'/industries/'+industry}/>;
}
