import ResourceCollection,{pageMetadata} from '@/components/ResourceCollection';
import {bookingTips} from '@/lib/articles/booking-tips.mjs';
export const metadata=pageMetadata('/resources/tips-and-tricks','Booking Tips & Tricks for Service Businesses','Short, practical tips for filling appointment gaps, sharing your booking link and writing clear customer reminders. Examples you can adapt to your business.');
export default function Tips(){return <ResourceCollection title="Small changes for a smoother diary." description="A clearer reminder. A booking link people can find. A better way to share a free appointment. Pick one thing to try in your business." items={bookingTips} path="/resources/tips-and-tricks" label="Tips & tricks"/>}
