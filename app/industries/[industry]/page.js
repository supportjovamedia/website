import {notFound} from 'next/navigation';
import {bookingIndustries} from '@/lib/jovabook-industries.mjs';
import {pageMetadata} from '@/lib/seo';
import BookingIndustryLanding from '@/components/BookingIndustryLanding';

export const dynamicParams=false;
export function generateStaticParams(){return bookingIndustries.map(item=>({industry:item.slug}));}
export async function generateMetadata({params}){
 const {industry}=await params,item=bookingIndustries.find(x=>x.slug===industry);
 return item?pageMetadata('/industries/'+industry,item.searchTitle+' | JovaBook by JovaMedia',item.description||item.intro):{};
}
export default async function IndustryPage({params}){
 const {industry}=await params,item=bookingIndustries.find(x=>x.slug===industry);
 if(!item)notFound();
 return <BookingIndustryLanding item={item} path={'/industries/'+industry}/>;
}
