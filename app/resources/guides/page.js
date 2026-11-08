import ResourceCollection,{pageMetadata} from '@/components/ResourceCollection';
import {googleGrowthArticles} from '@/lib/articles/google-growth.mjs';
import {bookingGrowthArticles,bookingComparisonArticle} from '@/lib/articles/booking-growth.mjs';
export const metadata=pageMetadata('/resources/guides','Booking Setup, Costs & Google Guides for Small Businesses','Free service-menu templates, booking-system switching checklists, UK platform comparisons and step-by-step Google guides for service businesses.');
export default function Guides(){return <ResourceCollection title="Guides you can put to work." description="Build your service menu, compare booking costs, plan a switch or get found on Google. Start with the job you need to do." items={[...bookingGrowthArticles,bookingComparisonArticle,...googleGrowthArticles]} path="/resources/guides" label="Guides"/>}
