import BookingIndustryLanding from '@/components/BookingIndustryLanding';
import {onlineBooking} from '@/lib/jovabook-industries.mjs';
import {bookingGuideMetadata} from '@/lib/jovabook-industry-metadata';

export const metadata=bookingGuideMetadata('/online-booking',onlineBooking);
export default function OnlineBookingPage(){return <BookingIndustryLanding item={onlineBooking} path='/online-booking'/>;}
