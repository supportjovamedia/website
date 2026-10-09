import BookingApp from './BookingApp';
import {businessSlug} from '@/lib/booking/business.mjs';
export const dynamic='force-dynamic';
export default function BookingPreview(){return <BookingApp salonSlug={businessSlug()}/>}
