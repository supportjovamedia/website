import ResourceCollection,{pageMetadata} from '@/components/ResourceCollection';
import {googleGrowthArticles} from '@/lib/articles/google-growth.mjs';
export const metadata=pageMetadata('/resources/guides','Google & Online Booking Guides for Small Businesses','Step-by-step guides to Google Business Profile, booking links, local website SEO and genuine reviews. Practical help you can work through yourself.');
export default function Guides(){return <ResourceCollection title="Guides you can put to work." description="Set up your Google profile, connect your booking link and improve the information customers find about you. Start with the step you need." items={googleGrowthArticles} path="/resources/guides" label="Guides"/>}
