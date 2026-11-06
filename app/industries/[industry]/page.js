import {notFound} from 'next/navigation';
import {bookingIndustries} from '@/lib/jovabook-industries.mjs';
import {bookingGuideMetadata} from '@/lib/jovabook-industry-metadata';
import BookingIndustryLanding from '@/components/BookingIndustryLanding';

export const dynamicParams=false;
export function generateStaticParams(){return bookingIndustries.map(item=>({industry:item.slug}));}
export async function generateMetadata({params}){
 const {industry}=await params,item=bookingIndustries.find(x=>x.slug===industry);
 if(!item)return {};
 return bookingGuideMetadata('/industries/'+industry,item);
}
export default async function IndustryPage({params}){
 const {industry}=await params,item=bookingIndustries.find(x=>x.slug===industry);
 if(!item)notFound();
 return <BookingIndustryLanding item={item} path={'/industries/'+industry}/>;
}
