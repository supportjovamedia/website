import ResourceCollection,{pageMetadata} from '@/components/ResourceCollection';
import {articles} from '@/lib/insights.mjs';
export const metadata=pageMetadata('/resources/guides','Booking Setup, Costs & Google Guides for Small Businesses','Free service-menu templates, booking-system switching checklists, UK platform comparisons and step-by-step Google guides for service businesses.');
export default function Guides(){return <ResourceCollection title="Guides you can put to work." description="Plan your website, build a service menu, compare booking costs or get found on Google. Start with the job you need to do." items={articles.filter(article=>article.collection==='guides'||article.series==='google-growth')} path="/resources/guides" label="Guides"/>}
