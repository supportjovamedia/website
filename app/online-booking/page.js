import BookingIndustryLanding from '@/components/BookingIndustryLanding';
import {onlineBooking} from '@/lib/jovabook-industries.mjs';
import {pageMetadata} from '@/lib/seo';

export const metadata=pageMetadata('/online-booking','Online booking software | JovaBook by JovaMedia',onlineBooking.description);
export default function OnlineBookingPage(){return <BookingIndustryLanding item={onlineBooking} path='/online-booking'/>;}
