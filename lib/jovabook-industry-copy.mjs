// Each page answers the scheduling questions for that particular business.
// Product limits remain in the page FAQs rather than being obscured by keywords.
import {industrySearch} from './jovabook-industry-search.mjs';

const pageCopy={
 'barbers':{
  title:'Online booking software for barbers',
  heroIntro:'JovaBook gives your barbershop an online booking link, an appointment calendar and a business website. Let clients choose their cut and book a time, then manage the diary between appointments.',
  sections:[
   {heading:'A barber appointment calendar for the way your shop works',paragraphs:[
    'A busy barbershop can have regular appointments, longer services and people asking about today’s availability at the same time. Use JovaBook’s day view to see the appointments already in your diary. Switch to a week or month view when you need to look further ahead. A booking added by you belongs in the same calendar as an appointment made online.',
    'If you also take walk-ins, add their appointments to the diary yourself and keep your published availability up to date. The calendar helps organise booked time; it does not operate a live walk-in queue. You decide how much of your working day to make available for online appointments.',
   ]},
   {heading:'Give clients the right booking options before they choose a time',paragraphs:[
    'A beard trim may need a different appointment length from a skin fade or a combined cut and beard service. Create separate services with the price and duration you actually offer. Clear descriptions help a new client choose the right booking instead of selecting a short slot for a longer appointment.',
    'When another barber needs a separate diary, Team supports additional staff calendars and logins. Clients can choose a team member on the booking page. Each extra staff seat is charged separately, so a one-person shop can begin with a single calendar and add another when the business needs it.',
   ]},
   {heading:'Share your barber booking link wherever regulars find you',paragraphs:[
    'Put your online booking link in your Instagram bio, on your existing website or in a message to a regular client. The booking page works in a browser, so clients can see the services and available times you publish without downloading a barber booking app. The one-page business website included with JovaBook gives new clients another route to the same booking page.',
    'Start with Free if one calendar and 20 monthly bookings fit your shop. Solo adds unlimited monthly bookings and Stripe deposits. If you choose to take deposits, connect your own Stripe account and set the deposit percentage. Every plan has 0% booking commission; Stripe processing fees are separate.',
   ]},
  ],
 },
 'hair-salons':{
  title:'Online booking software for hair salons',
  heroIntro:'Manage salon appointments, stylist availability and your service menu with JovaBook. Give clients an online booking system that connects to your diary, with a business website included.',
  sections:[
   {heading:'Salon appointment scheduling starts with the service menu',paragraphs:[
    'A client looking for a cut and finish needs different information from someone arranging their first colour consultation. Publish clear service names, descriptions, prices and durations. That gives clients a better chance of choosing an appointment that matches the work they want, and gives you an appointment length you can plan around.',
    'Build the menu around the services you can book as a complete appointment. If a colour service involves processing time or several stages, allow enough time in its configured duration. JovaBook does not automatically split a treatment into processing stages or reserve a chair between overlapping services.',
   ]},
   {heading:'Keep your salon diary and stylist calendars together',paragraphs:[
    'Use the calendar to review today’s appointments, look ahead at the week or add a booking made over the phone. Your services and working hours belong to the same workspace, so you can manage the information behind online availability alongside the diary. Keep time away and changes to your working day reflected in that availability.',
    'For a salon with several bookable stylists, Team provides staff calendars and separate logins. Clients can choose a stylist on the booking page. Extra staff seats are charged separately. A salon owner working alone can begin with one calendar and change plans when more staff need to take appointments.',
   ]},
   {heading:'Take salon bookings through your website and social profiles',paragraphs:[
    'Share your salon’s booking link in the places clients already use to contact you. It can sit in your Instagram bio, in an email or on your current website. Every JovaBook plan also includes a one-page business website for your introduction, opening hours and contact details. Solo and Team let you embed bookings on an existing site.',
    'Percentage deposits are available on Solo and Team through your own connected Stripe account. Set a deposit percentage for the business when you want clients to contribute at booking. Your subscription and Stripe processing fees are separate, and JovaBook charges 0% booking commission on every plan.',
   ]},
  ],
 },
 'nail-salons':{
  title:'Online booking software for nail salons',
  heroIntro:'JovaBook brings nail appointments, treatment durations and your booking calendar into one workspace. Share a link for manicures, infills and removals, with a website included for your business.',
  sections:[
   {heading:'An appointment booking system that reflects your nail services',paragraphs:[
    'New sets, infills and removals need clear descriptions because they are different appointments. List each service with the time and price you need to deliver it. Explain what is included before a client chooses a time. This is especially useful when clients arrive from an Instagram post showing a style rather than a specific service.',
    'If removing an existing set or adding detailed nail art changes the length of the appointment, publish the appropriate combined service. JovaBook uses the duration you set; it does not automatically work out extra time from an inspiration image. You keep control of which treatments are available for instant booking.',
   ]},
   {heading:'Manage a solo nail diary or calendars for several technicians',paragraphs:[
    'Review your day in the appointment calendar, or switch to the week view when arranging an infill for a returning client. You can add a booking yourself when it comes through a message. Keeping those appointments in the same diary as online bookings makes your working day easier to review.',
    'Free and Solo include one bookable calendar. If several technicians need their own availability, Team supports additional staff seats with separate calendars and logins. For a home-based or mobile nail business, check the public address and contact information you publish. Allow for travel and preparation within your own schedule.',
   ]},
   {heading:'Turn your nail booking link into a clear next step',paragraphs:[
    'Place the booking link beside your work on Instagram or share it directly when someone asks about an appointment. Clients open it in their browser to choose a service and an available time. Your included business website can bring your introduction, contact details and booking route together, even if you do not have a separate nail salon website.',
    'You can begin on Free with 20 bookings a month and upgrade when that allowance no longer fits. Solo and Team include Stripe deposits, so you can choose a percentage for clients to pay when booking. JovaBook does not take booking commission; Stripe payment-processing charges are separate.',
   ]},
  ],
 },
 'spas':{
  title:'Online booking software for spas',
  heroIntro:'Give guests a clear way to book individual spa treatments online. JovaBook connects your treatment menu, therapist availability and appointment calendar, with a business website included.',
  sections:[
   {heading:'Make your spa treatment menu straightforward to book',paragraphs:[
    'Guests need to know which treatment they are choosing, how long it takes and what it costs. Use separate services for your facials, massages and other individual appointments. Write descriptions around what the appointment includes so a guest can make a useful choice before selecting an available time.',
    'Set each duration to reflect the time you need in the diary. Preparation and turnaround time still need to be allowed for in the way you organise appointments. An individual treatment booking is different from a spa-day itinerary: JovaBook does not build a sequence of treatments, reserve facility access or manage package credits.',
   ]},
   {heading:'Organise therapist appointments and check shared resources',paragraphs:[
    'The calendar gives you a place to review scheduled treatments across the working day. Add appointments made directly with reception and review upcoming online bookings from the same workspace. When another therapist needs to take appointments, Team provides an additional staff calendar and login through a paid extra seat.',
    'Availability follows staff calendars. If two therapists use the same treatment room or a piece of equipment, you must manage that shared resource yourself. Before opening a service for online booking, check that your therapist schedule and room arrangements work together. Automatic room allocation is outside this booking system.',
   ]},
   {heading:'Give guests one spa booking link to return to',paragraphs:[
    'Link to your spa booking page from your website, social profiles and messages. Every plan includes a one-page business website, which can show your public business details and provide the same route to appointments. Guests use the booking page in a web browser rather than installing an app.',
    'Solo and Team support percentage deposits through your connected Stripe account. This can make the payment expected at booking clear for the treatments you publish. Start with the Free allowance if it fits your appointment volume, and compare the paid plans when you need unlimited monthly bookings or additional therapist diaries.',
   ]},
  ],
 },
 'medical-spas':{
  title:'Online booking software for medical spas',
  heroIntro:'Organise medical spa consultation slots and practitioner appointments with JovaBook. Use a clear online booking route for scheduling alongside the clinical systems and processes your practice needs.',
  sections:[
   {heading:'Use appointment scheduling for the administrative part of your practice',paragraphs:[
    'A prospective client may need an initial consultation before any treatment can be agreed. Publish the appointment types your practice can make available online, with neutral descriptions, suitable durations and the relevant practitioner availability. A booking records the appointment; it does not decide whether someone is suitable for a procedure.',
    'Keep assessment and treatment decisions in your clinical workflow. JovaBook does not provide prescribing, medical intake, clinical consent or treatment records. Your booking page should not ask clients to describe symptoms, diagnoses or medical histories. Confirm that the administrative booking process fits your practice before publishing it.',
   ]},
   {heading:'Plan practitioner availability in an appointment calendar',paragraphs:[
    'Create a service menu that distinguishes an initial appointment from a follow-up or another bookable consultation. Set the time each appointment needs rather than giving every service the same duration. Review the diary in day, week or month view and add bookings made through your own reception process.',
    'Team supports additional practitioner calendars and staff logins through paid extra seats. Those calendars do not automatically reserve a clinical room or a shared device. Equipment availability, practitioner suitability and treatment prerequisites remain checks for your practice, alongside the booking information in the diary.',
   ]},
   {heading:'Publish a booking route with clear information and clear limits',paragraphs:[
    'Your JovaBook business website can show general opening hours, location and contact details, with a link to the appointment page. You can also link directly from an existing practice website. Keep the public descriptions focused on what appointment someone is arranging and what happens next in your own process.',
    'JovaBook is general appointment software. No healthcare-specific certification, clinical data agreement or compliance arrangement is included by this page. Check your privacy, contractual and operational requirements before adopting it. Medical records and other sensitive health information need appropriate separate systems.',
   ]},
  ],
 },
 'tanning-salons':{
  title:'Online booking software for spray tanning',
  heroIntro:'Let clients book individual spray tan appointments through a link you share. JovaBook gives your tanning business a service menu, appointment diary and one-page website.',
  sections:[
   {heading:'Set up a booking system for fixed spray tan appointments',paragraphs:[
    'Publish the spray tanning services you can offer as fixed appointments. Each service has its own name, description, price and duration, so clients can see the options before choosing a time. If a first appointment needs a consultation, explain that in the service information and allow the time your process requires.',
    'The booking system uses the appointment details you enter. It does not decide eligibility, calculate exposure limits or check safety requirements. Your business remains responsible for those processes. Use a specialist system where equipment controls or tanning safety records are central to how you operate.',
   ]},
   {heading:'Keep your tanning appointment diary up to date',paragraphs:[
    'Use the calendar to review the day’s appointments and add bookings arranged through a message or over the phone. Make your working hours reflect the times you can actually take clients. If you travel to appointments, leave the time you need in your schedule; JovaBook does not calculate a travel route between bookings.',
    'A staff calendar represents a person’s appointments, rather than a tanning bed, room or booth. Team supports additional staff diaries through paid extra seats. If several appointments depend on the same room or equipment, check that shared availability yourself before making the times bookable.',
   ]},
   {heading:'Share an online booking link for your tanning business',paragraphs:[
    'Put your booking link on your social profiles or send it when someone asks for an appointment. Clients open the page in a browser, choose the service and select from the times you publish. Your included one-page website can introduce the business and provide public opening hours and contact information.',
    'Free includes one calendar and 20 monthly bookings. Solo and Team support percentage deposits through Stripe. This is appointment booking, rather than a tanning membership or session-credit service: package balances, sunbed access and equipment management are outside the product described here.',
   ]},
  ],
 },
 'pilates-instructors':{
  title:'Online booking software for Pilates instructors',
  heroIntro:'Arrange private Pilates sessions with an online booking link and a diary built around your teaching hours. JovaBook supports one-to-one appointments and includes a website for your business.',
  sections:[
   {heading:'Schedule private Pilates appointments around your teaching day',paragraphs:[
    'Give a new client a clear way to arrange an introductory session, then publish the regular private appointments you offer. Each service can have its own duration and price. Set availability around the hours you teach so clients choose from appointment times you are prepared to take.',
    'Use the calendar to review individual sessions across a day or week. Add appointments yourself when you arrange them directly with a client. If you teach in more than one place, allow the necessary time between appointments within your own schedule. The booking system does not plan travel or allocate a studio.',
   ]},
   {heading:'Choose booking software that fits one-to-one Pilates',paragraphs:[
    'JovaBook’s appointment model gives one client a staff slot for a service. That can suit private Pilates tuition, where the appointment belongs to a particular instructor. Team supports extra instructor calendars and separate logins when more people need to take private appointments.',
    'A group class has different scheduling requirements. JovaBook does not manage class capacity, a reformer inventory, attendance passes or waitlists. If your studio’s main need is to sell places in a group timetable, check those requirements separately. The workflow on this page is for individual appointments.',
   ]},
   {heading:'Give private clients a direct route to their next session',paragraphs:[
    'Share the booking link through your existing website or directly with clients. The included one-page business website can hold your introduction, general contact details and booking route. Clients use their browser to choose an available private session, so the booking process does not depend on an app download.',
    'Start with Free if 20 bookings a month fit your private-session work. Solo adds unlimited monthly bookings and Stripe deposits. Memberships and session packs are separate requirements that JovaBook does not provide; a booking here is an individual appointment with the price and duration you publish.',
   ]},
  ],
 },
 'mental-health-practitioners':{
  title:'Online booking software for mental health practitioners',
  heroIntro:'Explore JovaBook for administrative appointment scheduling and practitioner availability. Review the product’s limits before using it alongside the clinical systems your private practice requires.',
  sections:[
   {heading:'Keep administrative appointment booking separate from clinical information',paragraphs:[
    'A scheduling page should make it clear which appointment someone is arranging and which times are available. Use neutral service labels and suitable appointment lengths. Avoid requesting symptoms, diagnoses or personal circumstances in booking descriptions or other fields. Even appointment information needs to be considered within your practice’s own privacy requirements.',
    'JovaBook does not provide clinical intake, therapy records or crisis triage. Do not use it to assess urgency or invite someone to describe an emergency. Clinical communication, health records and any sensitive supporting information belong in systems and processes appropriate to your practice.',
   ]},
   {heading:'Review availability in a practitioner appointment diary',paragraphs:[
    'Set the hours you make available for administrative bookings, then review appointments in day, week or month view. Different services can have different durations where that fits your process. Add appointments made through your reception arrangements to the same diary so you can review the scheduled day together.',
    'Team supports additional staff calendars and logins through paid extra seats. It does not supply a clinical team workspace, supervision records or secure clinical messaging. Before using shared administrative access, check that the product’s access arrangements meet the requirements of your practice.',
   ]},
   {heading:'Check suitability before adopting a new booking system',paragraphs:[
    'JovaBook is general business scheduling software. No healthcare-specific certification, BAA or clinical data agreement is promised here. Your decision needs to cover the type of information processed, the agreements you require and the way staff will use the system. An appointment tool is only suitable if those requirements can be met.',
    'Where the administrative workflow is suitable, you can link to the booking page from a practice website and publish general business information on the included one-page site. Video consultations, treatment notes and ongoing clinical correspondence remain outside the booking service described on this page.',
   ]},
  ],
 },
 'lash-and-brow-artists':{
  title:'Online booking software for lash and brow artists',
  heroIntro:'Manage lash and brow appointments through one booking page and calendar. JovaBook lets clients choose a treatment and an available time, while you organise the service menu and your working day.',
  sections:[
   {heading:'Make full sets, infills and brow treatments clear to book',paragraphs:[
    'A full set and an infill can take different amounts of time. A brow appointment may need a different slot again. Publish the treatments you offer as separate services, with descriptions that help a client understand the choice. Set a price and duration for each so the appointment in your diary reflects the service selected.',
    'If eligibility for an infill depends on the existing set or the time since a previous visit, explain your requirements in the service description. JovaBook does not assess lash condition or automatically enforce a treatment prerequisite. You decide which services can be booked directly and which need a conversation first.',
   ]},
   {heading:'Manage appointments around the time each treatment needs',paragraphs:[
    'Check the day’s lash and brow bookings in your calendar, then look ahead when arranging a client’s next visit. Appointments made through your booking page and bookings added by you belong in the same diary. Keep your working hours and time away accurate so the available appointments are useful.',
    'Patch testing and treatment checks remain part of your own business process. You can publish a separate appointment where that is appropriate, but the system does not automatically verify that a test has been completed. Team adds separate staff calendars when more than one artist needs to take appointments.',
   ]},
   {heading:'Connect your Instagram work to an online booking link',paragraphs:[
    'When a potential client finds a lash or brow result on your profile, give them an obvious route to your published treatments. Use the same booking link in your bio and in messages. Your included business website can show an introduction, public contact details and the route to appointments without a separate website project.',
    'Clients book through their browser. Free includes one calendar and 20 bookings each month; Solo adds unlimited monthly bookings. Solo and Team also support percentage deposits through your connected Stripe account. The payment-processing fees charged by Stripe are separate from your JovaBook subscription.',
   ]},
  ],
 },
 'massage-therapists':{
  title:'Online booking software for massage therapists',
  heroIntro:'Give clients an online booking route for your massage appointments. Organise treatment lengths, working hours and your diary in JovaBook, with a one-page business website included.',
  sections:[
   {heading:'Build massage appointment scheduling around your session lengths',paragraphs:[
    'A focused treatment and a longer massage should be clear choices on the booking page. Create a separate service for each appointment you offer and give it an appropriate duration. Include the practical details a client needs to choose, while keeping health histories and treatment assessments out of general booking fields.',
    'Allow the time you need for preparation and turnaround in the way you organise appointments. JovaBook uses your configured service durations and working availability. It does not calculate cleaning time from a treatment description or assess which type of massage is appropriate for an individual client.',
   ]},
   {heading:'Keep your treatment diary useful across the week',paragraphs:[
    'Review upcoming appointments in the calendar and add bookings that you arrange directly. A week view can help you see the shape of your working hours, while day view keeps the next appointments close at hand. Keep availability aligned with the times and locations where you can actually deliver treatments.',
    'For a mobile massage business, plan travel time and service areas yourself. For a shared practice, check treatment-room availability separately. Team supports additional therapist calendars and staff logins, but the booking system does not allocate rooms or plan routes between clients.',
   ]},
   {heading:'Share massage booking through your website or messages',paragraphs:[
    'Link your booking page from your current website, your social profiles or a direct message. Every JovaBook plan includes a one-page business website for a business introduction and public contact information. Clients use a web browser to choose a service and one of the appointment times you publish.',
    'Solo and Team let you take percentage deposits through your own connected Stripe account. Free gives you a way to begin with one calendar and 20 monthly bookings. Medical intake, diagnoses and clinical treatment records are outside this product’s role and need appropriate separate systems.',
   ]},
  ],
 },
 'yoga-instructors':{
  title:'Online booking software for private yoga sessions',
  heroIntro:'Let clients book one-to-one yoga sessions around your available teaching hours. JovaBook brings your appointment calendar, booking link and business website together.',
  sections:[
   {heading:'Arrange private yoga appointments with clear session choices',paragraphs:[
    'List the individual sessions you teach with their own price, duration and description. An introductory appointment may be different from a regular one-to-one session, so make the options clear before a client chooses a time. Set your availability around the hours you want to teach private clients.',
    'The calendar holds online bookings and appointments you add yourself. Use a day or week view when you are reviewing private tuition alongside your other commitments. If a session involves travel or hiring a room, account for that time and availability through your own arrangements.',
   ]},
   {heading:'Match the booking system to individual tuition',paragraphs:[
    'JovaBook is designed around individual appointments with a staff member. That makes the relevant workflow here private yoga tuition, rather than selling multiple places in a class. Team supports separate instructor calendars and logins if additional teachers need to take one-to-one appointments.',
    'Group-class capacity, class passes, waitlists and retreat itineraries are outside the product described on this page. If those are the main things your studio needs, assess them separately before choosing software. Each JovaBook service is booked as an individual appointment for its configured duration.',
   ]},
   {heading:'Give yoga clients a booking link they can use again',paragraphs:[
    'Put the booking link on your current website or share it directly with clients. Your included JovaBook business website can introduce the teaching business and provide public contact details. The booking page opens in a browser, so clients do not need a separate yoga booking app to select a private session.',
    'Free includes one calendar and 20 monthly bookings. Solo adds unlimited monthly bookings, while Team supports extra instructor seats. Paid plans can also take percentage deposits through your connected Stripe account. Memberships and bundles of session credits are not part of that appointment-booking workflow.',
   ]},
  ],
 },
 'tattoo-artists':{
  title:'Online booking software for tattoo artists',
  heroIntro:'Manage tattoo consultations and agreed appointment slots in one diary. JovaBook gives your studio an online booking link, artist calendars and a business website.',
  sections:[
   {heading:'Use online appointment booking for the parts you can schedule clearly',paragraphs:[
    'Custom tattoo work often needs a discussion before a price or appointment length can be agreed. Publish a consultation when that is the right first step. Once you have discussed the design and timing, add the agreed appointment to your diary through your own process.',
    'For a fixed service that clients can choose directly, provide a clear description, price and duration. A booking page should describe an appointment you can actually deliver within that slot. JovaBook does not assess uploaded artwork, calculate a custom quotation or approve a design for you.',
   ]},
   {heading:'Keep consultations and artist appointments in one calendar',paragraphs:[
    'Review the studio’s appointments by day, week or month. Add bookings arranged directly with a client and keep time away reflected in artist availability. Separate service durations help distinguish a short consultation from a longer booked session, rather than leaving every appointment the same length.',
    'Team supports extra staff calendars and logins when several artists need their own diaries. Shared rooms, workstations and equipment still need your own availability checks. Identity, age eligibility and treatment consent also remain part of your studio’s process rather than a decision made by the booking software.',
   ]},
   {heading:'Link your studio’s work to its appointment page',paragraphs:[
    'Share your consultation booking link from your social profiles or existing portfolio website. The included one-page business website gives you another place for a business introduction, general opening hours and contact details. Clients can open the booking page in a browser to see the appointments you publish.',
    'Solo and Team support a percentage deposit on a published service price through your connected Stripe account. If a custom piece does not have an agreed price yet, resolve that through your quoting process first. JovaBook charges 0% booking commission; Stripe processing fees apply separately to deposits.',
   ]},
  ],
 },
 'salons-and-barbers':{
  title:'Online booking software for salons and barbers',
  heroIntro:'Bring your service menu, online appointments and staff diary together in JovaBook. Choose the salon or barbershop workflow that fits your business, with a website included on every plan.',
  sections:[
   {heading:'Choose the appointment workflow that fits the business',paragraphs:[
    'Hair salons and barbershops share a need for a clear diary, but the details of booking can differ. A salon may publish longer consultations and colour services, while a barber may combine booked cuts with time reserved for walk-ins. Start with the service menu and availability that reflect your actual working day.',
    'The dedicated salon and barber guides linked below go into those differences. Use them to check service timing, staff calendars and the limits around processing stages or walk-in queues. The booking system should help organise a workflow you can deliver, rather than advertise options your shop does not offer.',
   ]},
   {heading:'Keep online booking and appointments made in person together',paragraphs:[
    'Clients can choose a service and an available time through your booking link. You can also add appointments yourself when someone books at reception, calls the shop or sends a message. Use the calendar to review the scheduled day and switch to a week or month view to look ahead.',
    'If several stylists or barbers need separate availability, Team provides staff calendars and logins through paid extra seats. Free and Solo include a single calendar. Shared chairs, equipment and processing stages are separate practical constraints for you to manage alongside staff availability.',
   ]},
   {heading:'Give clients one route from your profile to an appointment',paragraphs:[
    'Share the same booking link on social profiles, an existing website and in messages. Every plan includes a one-page business website with a route to booking. Clients use their browser to see the menu and times you publish. Solo and Team also support an embedded booking widget on an existing site.',
    'Start on Free if 20 bookings a month fit your business. Solo adds unlimited monthly bookings and Stripe deposits; Team adds staff calendars. The plans all have 0% booking commission. Your subscription, extra staff seats where applicable and Stripe payment-processing fees are separate costs.',
   ]},
  ],
 },
 'beauty-and-nails':{
  title:'Online booking software for beauty and nail businesses',
  heroIntro:'Organise beauty appointments, nail treatments and your working hours with JovaBook. Share an online booking link connected to your service menu, calendar and included business website.',
  sections:[
   {heading:'Make the treatment choice clear before the appointment is booked',paragraphs:[
    'Beauty businesses can offer treatments with very different durations. Publish clear categories and service descriptions so a client can distinguish an infill from a new set, or a brow treatment from a longer lash appointment. Give each service the time and price you need for that work.',
    'The dedicated nail salon and lash-and-brow guides below explain those booking choices in more detail. If a treatment needs a patch test, consultation or other eligibility check, keep that requirement in your own business process. JovaBook does not automatically decide whether a client can receive a treatment.',
   ]},
   {heading:'Use one appointment calendar for online and direct bookings',paragraphs:[
    'Add appointments made over messages to the same diary as bookings from your public page. Review today’s schedule or look further ahead in week and month views. Your published working hours should reflect the appointments you can actually take, including time needed around services.',
    'Team supports extra calendars and logins when more beauty professionals need their own availability. Free and Solo each include one calendar. For a mobile business, plan travel yourself. For a shared salon, check rooms and equipment separately because availability is based on staff calendars.',
   ]},
   {heading:'Use your booking link alongside the work you share online',paragraphs:[
    'A client who finds your work on Instagram needs a clear route to the relevant appointment. Link to the booking page from your bio or send it in a message. The included business website can show your introduction and public contact information, and point people to the same appointment options.',
    'Clients choose services and times in their web browser. Start Free with 20 monthly bookings, or choose Solo for unlimited monthly bookings. Solo and Team support percentage deposits through your own connected Stripe account. Stripe processing fees are separate from the subscription, and JovaBook charges 0% booking commission.',
   ]},
  ],
 },
 'tutors':{
  title:'Online booking software for tutors',
  heroIntro:'Let students or parents arrange individual lessons through your booking link. JovaBook gives your tutoring business an appointment diary, service menu and included website.',
  sections:[
   {heading:'Publish individual lessons with the right length and price',paragraphs:[
    'A new-student introduction may need a different slot from a regular lesson. Create services that describe the individual tuition you offer, including the subject or lesson type where useful. Give each one a duration and price so the person booking understands what the appointment covers.',
    'Set your working hours around the time you are available to teach. If you travel between lessons or use a hired space, allow for those arrangements yourself. The booking system follows your appointment availability; it does not plan travel or reserve a classroom for you.',
   ]},
   {heading:'Manage lesson scheduling from a single appointment calendar',paragraphs:[
    'Students or parents can select from the times you publish, and you can add lessons arranged directly. Review the diary in day, week or month view when planning around your other commitments. Keep changes to working hours and time away reflected in your available appointments.',
    'Free and Solo include one calendar. Team supports additional tutor calendars and staff logins through paid extra seats. This is individual appointment scheduling: class capacity, course enrolment, learning materials and student progress assessment require separate tools.',
   ]},
   {heading:'Put a direct lesson-booking route on your tutoring website',paragraphs:[
    'Every plan includes a one-page business website where you can introduce the tutoring business and publish general contact details. You can also link to the booking page from an existing site or share it directly. Parents and students open it in a browser to choose an available individual lesson.',
    'Free includes 20 monthly bookings and 50 emails. Solo adds unlimited monthly bookings and supports Stripe deposits. Keep safeguarding records, learning assessments and other sensitive student information in appropriate separate systems. The booking page is for arranging the appointment, not for collecting a complete student record.',
   ]},
  ],
 },
 'personal-trainers':{
  title:'Online booking software for personal trainers',
  heroIntro:'Organise one-to-one training appointments around the hours you coach. JovaBook connects your online booking page, session calendar and business website in one workspace.',
  sections:[
   {heading:'Make personal training sessions clear to book',paragraphs:[
    'Publish the one-to-one appointments you offer with a clear duration, price and description. An introductory consultation may need a different slot from a regular training session. Set each service up separately so clients can choose the appointment they need before selecting a time.',
    'Your availability should reflect the times and places where you can actually coach. If you move between a gym, a private studio and clients’ locations, allow for travel and venue arrangements yourself. JovaBook does not calculate routes or reserve gym access as part of the appointment.',
   ]},
   {heading:'Review client sessions in your training diary',paragraphs:[
    'The calendar brings online bookings together with appointments you add yourself. Use day view between sessions or week view when planning the next stretch of coaching. Keep your working hours and time away up to date so the bookable times match your schedule.',
    'Team supports additional trainer calendars and separate staff logins if your coaching business grows. Extra seats are charged separately. Workout programmes, progress tracking, gym memberships and package-credit balances remain outside this appointment system.',
   ]},
   {heading:'Share a booking link from your fitness profile or website',paragraphs:[
    'Use your booking page as the next step when a potential client asks about an appointment. Put the link in your social bio, send it directly or add it to your existing site. Every plan includes a one-page business website to introduce the business and provide a route to booking.',
    'Clients use their browser to choose a session and available time. Start with Free if one calendar and 20 monthly bookings suit your work. Solo adds unlimited monthly bookings and Stripe deposits; Team supports extra calendars. JovaBook charges 0% booking commission, with Stripe payment-processing fees separate.',
   ]},
  ],
 },
 'clinics':{
  title:'Online booking software for clinic appointments',
  heroIntro:'Manage administrative appointment slots and practitioner availability with JovaBook. Review its scheduling capabilities and limits alongside the clinical systems your practice needs.',
  sections:[
   {heading:'Publish clear appointment types for administrative booking',paragraphs:[
    'Distinguish an initial appointment from a follow-up in the services you make bookable. Give each an appropriate duration and a neutral description. The aim is to help someone choose an administrative slot, while assessment, diagnosis and treatment decisions remain with your practice.',
    'Do not ask for symptoms, medical histories or other sensitive health details through the booking page. JovaBook does not provide clinical intake or clinical records. Confirm that the information processed by an administrative booking fits your practice’s privacy and contractual requirements before adoption.',
   ]},
   {heading:'Organise practitioner appointment calendars',paragraphs:[
    'Set the hours a practitioner is available and review booked appointments in day, week or month view. Add appointments made through reception to the same diary as online bookings. Different service durations let you distinguish the time needed for the appointment types you publish.',
    'Team supports extra staff calendars and separate logins through paid additional seats. Staff availability does not automatically reserve a treatment room or a shared clinical device. Keep those resource checks, practitioner eligibility and other clinical requirements in your own operational process.',
   ]},
   {heading:'Decide whether general booking software fits your practice',paragraphs:[
    'JovaBook is a general business appointment system rather than a clinical practice-management product. No healthcare-specific compliance certification or clinical data agreement is promised on this page. Medical records, diagnoses, prescriptions and treatment documentation need appropriate separate systems.',
    'Where the administrative scheduling workflow meets your requirements, link to the booking page from an existing practice website. The included one-page business website can hold public opening hours and contact details. The page does not replace your clinical communication, triage or patient-care processes.',
   ]},
  ],
 },
 'online-booking':{
  title:'Online booking software for service businesses',
  heroIntro:'Give clients one link to choose a service and book an available appointment. JovaBook connects online booking, your appointment calendar and a one-page business website.',
  sections:[
   {heading:'How an online appointment booking system works',paragraphs:[
    'Start with the services you want clients to book. Add a clear name, description, price and duration for each, then set your business’s working hours. The booking page brings those choices together so a client can select a service and an available appointment time.',
    'The appointment belongs in your JovaBook diary, alongside bookings you add yourself. Use day, week or month view to review your schedule. Keep availability and time away aligned with the working day you can actually deliver, including your own arrangements for travel or shared resources.',
   ]},
   {heading:'Use your booking link on an existing website or social profile',paragraphs:[
    'The same booking link can work in your Instagram bio, on a website button and in a message to a returning client. Every plan includes a one-page business website with public business details and a route to appointments. Solo and Team also support embedding the booking widget on an existing site.',
    'The booking page works in a web browser. Clients do not need an app-store download to choose a service and a time. Clear service information matters whichever route they use, because the page should help them select the appointment your business is prepared to offer.',
   ]},
   {heading:'Choose appointment scheduling software around your business needs',paragraphs:[
    'Free includes one calendar, 20 monthly bookings and 50 emails. Solo adds unlimited monthly bookings and Stripe deposits. Team supports additional staff calendars and logins, with extra staff seats charged separately. Start with the plan that matches the appointments and people you need to organise.',
    'JovaBook handles individual appointments, services and client contact records. Group-class capacity, equipment allocation, membership credits and clinical records are separate requirements. Explore the industry guides to see how the scheduling workflow fits a particular business before deciding what to publish online.',
   ]},
  ],
 },
};

const additionalContent={
 barbers:{
  heading:'Move from messages or a paper diary to online booking',
  paragraphs:[
   'Set up the services and hours you want to publish before giving clients the link. Add your existing future appointments to the diary so you are not offering time that is already booked. Check the service lengths against the way you cut, rather than copying timings from another shop.',
   'Open your public booking page on a phone and review the choices a client sees. Make sure the business details and available times are right. When the menu is ready, use that same link consistently instead of asking regulars to guess which profile or message thread to use.',
  ],
  faqs:[
   ['Can clients choose a particular barber online?','Yes, with Team. Staff selection is available on the booking page, and additional bookable barbers need paid extra staff seats. Free and Solo each include one calendar, so they suit a single bookable barber.'],
   ['Do clients need to install a barber booking app?','No. Your JovaBook booking link opens in a web browser. Clients can choose from the services and times you publish on their phone or computer. You can share that link from an existing website as well as your social profiles.'],
  ],
 },
 'hair-salons':{
  heading:'Prepare your salon booking page before sharing it',
  paragraphs:[
   'Begin with the services you are comfortable making available for direct booking. Check the description, total duration and price of each, especially where a consultation or a longer colour service needs a different appointment. Add bookings already agreed with clients before publishing your availability.',
   'Review the public page from a client’s point of view. Check that the service choice and stylist options are clear and that the available times fit the way the salon works. You can start with a focused menu and expand it when you have checked the practical arrangements behind each service.',
  ],
  faqs:[
   ['Can I add salon booking to my current website?','Yes. Every plan lets you link to your JovaBook booking page from your existing salon website. Solo and Team also include an embeddable booking widget. You can keep your current site and use JovaBook for appointments.'],
   ['Is there a free salon booking plan?','Yes. Free includes one staff calendar, 20 bookings and 50 emails each month, plus a one-page business website. No card is required. Solo and Team are paid plans for higher booking volume, deposits or additional staff calendars.'],
  ],
 },
 'nail-salons':{
  heading:'Prepare your nail appointment menu before clients use it',
  paragraphs:[
   'Start with the services clients can choose accurately on their own. Explain the difference between an infill, removal and new set in the relevant description. If a style needs a discussion or a different amount of time, decide how you will agree that before putting an instant-booking option online.',
   'Add appointments you have already confirmed through messages before sharing the link. Check the page on a phone, including your public business details and the times available. For a home-based business, review which address information you are comfortable publishing before directing new clients to the site.',
  ],
  faqs:[
   ['Can I put my nail booking link in my Instagram bio?','Yes. Use the JovaBook booking page as the link in your bio or share it in a direct message. Clients can view the service menu and choose an available appointment in a browser. The same link can also appear on your website.'],
   ['Can several nail technicians have separate appointment diaries?','Yes, on Team. Each additional staff seat has a calendar and login and is charged separately. That lets clients book against a technician’s availability rather than putting every appointment into a single shared calendar.'],
  ],
 },
 spas:{
  heading:'Check treatment availability before opening bookings online',
  paragraphs:[
   'Start with individual treatments that fit the appointment model. Check the therapist time, treatment duration and any room or equipment needed before making a service available. Add existing confirmed treatments to the diary so the online schedule reflects commitments reception has already made.',
   'Review the public menu as a guest would see it, with particular attention to treatment lengths and what each appointment includes. If your spa also sells day access or multi-treatment packages, keep those arrangements in the systems you use for them. Publish only the appointments this booking workflow can support.',
  ],
  faqs:[
   ['Can guests book spa appointments from a phone?','Yes. The booking page works in a web browser on a phone or computer. Guests follow the link you share, choose a published service and select an available time. They do not need to install a separate booking app.'],
   ['Can I keep my existing spa website?','Yes. Link from your existing website to the JovaBook booking page on any plan. Solo and Team also support an embedded booking widget. The included JovaBook one-page website is an additional option, rather than a requirement to replace your current site.'],
  ],
 },
 'medical-spas':{
  heading:'Review the consultation-booking process before adoption',
  paragraphs:[
   'Map the information needed to arrange an appointment and check whether this general booking tool can meet your requirements. Review public service names, staff access and how people will be directed to your separate clinical process. Do that before inviting clients to use a new online booking page.',
   'Only publish appointment types your practice is prepared to arrange through the workflow. A booked time must not be presented as treatment approval. Keep the distinction clear in your own client communication, and make sure assessment and consent happen through the processes appropriate to the practice.',
  ],
  faqs:[
   ['Can online booking approve a client for an aesthetics treatment?','No. A booking arranges an appointment. It does not assess treatment suitability or provide medical approval. Practitioner assessment, treatment eligibility and consent remain part of your clinical process, using the systems appropriate to your practice.'],
   ['Can separate practitioners have their own appointment calendars?','Team supports extra staff calendars and logins through paid additional seats. This provides administrative scheduling, not clinical records or automatic room and equipment allocation. Review the access and resource arrangements your practice needs before using it.'],
  ],
 },
 'tanning-salons':{
  heading:'Publish only the tanning appointments your schedule can support',
  paragraphs:[
   'Before sharing the link, check the services and appointment lengths you have entered. Add existing confirmed appointments to the diary and review the staff hours you have made available. Make any eligibility or preparation arrangements part of your own client process.',
   'If your business mainly needs to control sunbed sessions or track a prepaid balance, this is a different requirement from staff appointment booking. Check that distinction before adopting a system. The JovaBook workflow here is a client choosing a published service and an available appointment with your business.',
  ],
  faqs:[
   ['Can clients use the tanning booking page without downloading an app?','Yes. The booking page opens in a web browser on a phone or computer. Share the link on your website or social profiles so clients can choose from your published appointment services and times.'],
   ['Can I book mobile spray tan appointments?','You can publish fixed appointment slots, but travel planning, service areas and location arrangements remain your responsibility. Leave the time you need between clients and check the practical details yourself. JovaBook does not calculate routes or dispatch visits.'],
  ],
 },
 'pilates-instructors':{
  heading:'Prepare a private-session schedule before sharing the link',
  paragraphs:[
   'Enter the individual sessions you can offer and check their durations against your teaching arrangements. Add private appointments already agreed with clients before opening online availability. If you share studio space or use a reformer that others also book, check that resource separately.',
   'Review the booking page on a phone and confirm that it describes private appointments clearly. Avoid using a service description to imply a group class, class pass or membership. Those products need a different booking model from one client reserving an instructor’s appointment slot.',
  ],
  faqs:[
   ['Can I start taking private Pilates bookings for free?','Yes. Free includes one calendar, 20 bookings and 50 emails per month, plus a one-page business website. No card is required. The booking workflow is for individual appointments rather than group-class places.'],
   ['Can another Pilates instructor have a separate diary?','Yes, with Team and an additional paid staff seat. Each extra instructor can have their own calendar and login. Shared reformers, rooms and other studio resources still need to be managed through your own arrangements.'],
  ],
 },
 'mental-health-practitioners':{
  heading:'Make the adoption decision before publishing appointment availability',
  paragraphs:[
   'Begin with your practice requirements, including what appointment information would be processed and who could access it. Review the contractual arrangements you need and the role of your existing clinical software. Do not assume that a general booking tool meets a healthcare requirement because it has a calendar.',
   'If the administrative workflow is suitable, review the public page carefully before sharing it. Keep descriptions neutral and make the role of the booking page clear in your own communication. Assessment, emergency support and clinical contact arrangements remain separate from choosing an appointment time.',
  ],
  faqs:[
   ['Does this online booking system include video therapy appointments?','It does not provide a telehealth or video-consultation service. This page covers administrative scheduling only. Any remote clinical appointment needs the separate tools, arrangements and safeguards appropriate to your practice.'],
   ['Should clients add symptoms or treatment details when booking?','No. Do not use general booking fields for symptoms, diagnoses, medical histories or treatment notes. Keep sensitive health information and clinical communication within appropriate separate systems. Review suitability before inviting anyone to use the booking page.'],
  ],
 },
 'lash-and-brow-artists':{
  heading:'Review the booking menu from your client’s point of view',
  paragraphs:[
   'Before sharing the link, check whether someone new to your business can distinguish the appointment options. Explain which infill or full-set service they should choose through the relevant descriptions. Keep any patch-test or treatment checks in your own process rather than relying on a booking to prove eligibility.',
   'Add appointments already confirmed through messages, then review your available hours. Open the booking page on a phone to check the service information and public business details. A focused treatment menu is easier to maintain than publishing every possible combination before you have decided its timing.',
  ],
  faqs:[
   ['Can I share lash and brow appointments from Instagram?','Yes. Put your JovaBook booking link in your bio or share it in a message. Clients can choose a published treatment and an available time in their web browser. You can use the same link on an existing website.'],
   ['Can different lash artists have their own calendars?','Yes, with Team and paid additional staff seats. Each extra staff seat has a calendar and login, and clients can choose a team member when booking. Free and Solo each include one bookable calendar.'],
  ],
 },
 'massage-therapists':{
  heading:'Check appointment timing before opening your massage diary online',
  paragraphs:[
   'Review the length of each published treatment and the time you need around it. Add appointments already arranged with clients before sharing online availability. If you work in a shared room or travel to visits, check those practical arrangements alongside your staff calendar.',
   'Keep the public booking descriptions focused on the appointment being offered. Medical assessment and sensitive intake information belong in appropriate separate systems. Test the booking page from a client’s phone view so the treatment choices, public contact details and available times are easy to understand.',
  ],
  faqs:[
   ['Can I link massage booking from an existing website?','Yes. Every plan lets you link to your JovaBook booking page from your current site. Solo and Team also support an embedded booking widget. You can keep your existing website and use JovaBook to organise appointments.'],
   ['Can I begin with a free massage appointment diary?','Yes. Free includes one calendar, 20 monthly bookings and 50 emails, plus a one-page business website. No card is required. Solo adds unlimited monthly bookings; Team supports additional paid staff calendars when other therapists need to take appointments.'],
  ],
 },
 'yoga-instructors':{
  heading:'Set up a booking page for the private sessions you teach',
  paragraphs:[
   'Check the session descriptions and lengths before making appointments available online. Add private lessons already agreed with clients to the diary, then review the hours that remain bookable. Allow for venue arrangements and travel yourself where your teaching takes place in different locations.',
   'Open the public page on a phone and confirm that the individual-session format is clear. If you also run group classes, keep the booking route for those separate and accurate. A private appointment with an instructor should not be described as a place in a multi-person class.',
  ],
  faqs:[
   ['Is there a free online booking option for a private yoga teacher?','Yes. Free includes one calendar, 20 appointments and 50 emails each month, with a one-page business website. No card is required. Solo adds unlimited monthly bookings when that better fits your private teaching schedule.'],
   ['Can clients book through my current yoga website?','Yes. You can add a link to the JovaBook booking page on any plan. Solo and Team also provide an embeddable booking widget. Clients use their browser, so a separate booking-app download is not required.'],
  ],
 },
 'tattoo-artists':{
  heading:'Set a clear boundary between consultation and confirmed work',
  paragraphs:[
   'Decide which appointments clients can book directly and which need a discussion first. Make that distinction clear in each service description. Add work already confirmed with clients to the diary before publishing online availability, using the appointment length agreed through your own process.',
   'Review the page as a new client would see it. A consultation slot should not imply that a custom design, price or treatment eligibility has been approved. Keep artwork approval, quoting, identity checks and consent in your studio’s process alongside the appointment information.',
  ],
  faqs:[
   ['Can I share a consultation booking link from my tattoo portfolio?','Yes. Link from your existing portfolio website or social profile to the JovaBook booking page. Clients can choose from the consultation services and times you publish in their browser. Solo and Team also support embedding bookings on an existing website.'],
   ['Can several tattoo artists have separate diaries?','Yes, with Team and paid extra staff seats. Each additional seat has a calendar and login. The booking system follows staff availability; shared workstations, equipment and the practical requirements of a session still need your own checks.'],
  ],
 },
 'salons-and-barbers':{
  heading:'Start with an accurate appointment diary before moving online',
  paragraphs:[
   'Set up the services and staff availability that match the way your shop runs. Check the length of each appointment and add existing future bookings before sharing the link. A salon with colour consultations and a barbershop taking regular cuts may publish different service choices even when both use the same calendar tools.',
   'Review the dedicated industry guide that fits your business and check the public page on a phone. The next step for a client should be clear: choose a service, find a bookable time and arrange the appointment through the page you have published.',
  ],
  faqs:[
   ['Is JovaBook a downloadable salon or barber booking app?','The booking page works in a web browser. Clients can follow your link on a phone or computer to choose from the services and times you publish. They do not need an app-store download to use the page.'],
   ['Can I keep my current salon or barbershop website?','Yes. Link to the JovaBook booking page from your existing site on any plan. Solo and Team also include an embeddable booking widget. Every plan includes a JovaBook one-page website as another option for your business.'],
  ],
 },
 'beauty-and-nails':{
  heading:'Prepare your beauty booking page before you share it',
  paragraphs:[
   'Choose the services clients can book accurately without a consultation and check the descriptions, prices and durations. Add appointments already confirmed through messages so they are represented in your diary. Keep working hours and time away aligned with the appointments you can deliver.',
   'Review the page on a phone, including your public address and contact information. If you offer several types of treatment, use the dedicated nail, lash or spa guides below to check the practical limits. Eligibility checks and treatment prerequisites remain part of your business process.',
  ],
  faqs:[
   ['Can my beauty booking link work on Instagram and my website?','Yes. Use the same JovaBook booking link in your social bio, in messages and on an existing website. Clients use a browser to choose a published service and available time. Solo and Team also support an embedded booking widget.'],
   ['Can I start with free appointment scheduling?','Yes. Free includes one staff calendar, 20 bookings and 50 emails each month, with a one-page business website. No card is required. Paid plans support higher booking volume, Stripe deposits and extra staff calendars where needed.'],
  ],
 },
 tutors:{
  heading:'Prepare your lesson schedule before opening online bookings',
  paragraphs:[
   'Check the subjects or lesson types you have made bookable and confirm their duration and price. Add existing agreed lessons to the diary before sharing your availability. Set public teaching hours around the time you actually want to offer for individual appointments.',
   'Review the page from the point of view of a parent or student booking for the first time. Keep the service information practical and clear, and avoid using booking fields to collect sensitive student information. Learning records and safeguarding arrangements belong in the appropriate separate systems you use for those purposes.',
  ],
  faqs:[
   ['Can students or parents book a lesson without installing an app?','Yes. Your JovaBook booking page opens in a web browser on a phone or computer. Share the link from your website or directly so they can choose an individual lesson type and an available appointment time.'],
   ['Is there a free tutoring appointment plan?','Yes. Free includes one calendar, 20 monthly bookings and 50 emails, plus a one-page business website. No card is required. Solo supports unlimited monthly bookings; Team adds separate staff calendars through paid extra seats.'],
  ],
 },
 'personal-trainers':{
  heading:'Prepare an online schedule for the sessions you can deliver',
  paragraphs:[
   'Create the individual training services you want clients to book, then check their length, price and description. Add sessions already agreed with clients before sharing your available hours. If you coach at more than one location, include the necessary travel and venue arrangements in your own planning.',
   'Open the page as a client would on a phone and check that the options describe real, bookable sessions. Use appropriate separate systems for health assessments, exercise plans and sensitive client information. The appointment diary organises scheduled time rather than providing a complete coaching programme.',
  ],
  faqs:[
   ['Can I start with a free personal training booking calendar?','Yes. Free includes one calendar, 20 monthly bookings and 50 emails, with a one-page business website. No card is required. You can compare Solo or Team when your booking volume or need for additional trainer calendars changes.'],
   ['Can I add appointment booking to my existing fitness website?','Yes. Every plan lets you link to your JovaBook booking page. Solo and Team also support an embedded booking widget on an existing website. Clients can choose sessions in their browser without installing a separate booking app.'],
  ],
 },
 clinics:{
  heading:'Review the practice’s requirements before opening online booking',
  paragraphs:[
   'Start by reviewing which administrative appointment information would be processed and which staff would need access. Check the agreements and privacy arrangements your practice requires. A general appointment calendar should not be assumed to provide healthcare-specific protections or clinical functionality.',
   'If the workflow is suitable, check public service descriptions, available hours and existing appointments before sharing the page. Keep treatment eligibility, consent and clinical communications within your own appropriate systems. A booking should arrange a time rather than imply that an assessment or treatment decision has already happened.',
  ],
  faqs:[
   ['Can I link appointment booking from an existing practice website?','Yes. You can link to the booking page from an existing website on any plan. Solo and Team also support an embedded booking widget. Review suitability for your practice before using either option, and keep clinical information out of general booking fields.'],
   ['Can more than one practitioner have a calendar?','Yes, with Team and additional paid staff seats. Each extra seat has a calendar and login. Shared treatment rooms, devices and clinical resource requirements still need your own checks, because appointment availability is based on staff calendars.'],
  ],
 },
 'online-booking':{
  heading:'Prepare your business for online appointment bookings',
  paragraphs:[
   'Before sharing the booking link, check your service names, descriptions, prices and durations. Set the business’s working hours and timezone correctly. Add existing confirmed appointments to the diary so you are not publishing availability that has already been promised to a client.',
   'Review the booking page on a phone as well as a computer. Check your public contact details and choose services that someone can book accurately without extra discussion. Where an appointment needs a separate consultation or eligibility check, make that part of your own business process clear.',
  ],
  faqs:[
   ['Can I add an appointment that a client books over the phone?','Yes. You can add bookings from your workspace, so appointments arranged directly can sit in the same diary as online bookings. Keep existing commitments and working availability up to date before sharing your public booking link.'],
   ['Can several staff members have different appointment calendars?','Yes, on Team. Additional staff seats provide separate calendars and logins and are charged separately from the base plan. Free and Solo each include one calendar. Shared rooms or equipment require your own availability checks.'],
  ],
 },
};

export const industryCopy=Object.fromEntries(Object.entries(pageCopy).map(([slug,copy])=>{
 const extra=additionalContent[slug];
 const search=industrySearch[slug];
 const sections=copy.sections.map((section,index)=>index===2?{...section,heading:search.linkHeading}:section);
 return [slug,{...copy,primaryTerm:search.primaryTerm,contextImage:search.contextImage,heroIntro:search.heroIntro,searchOverview:search.overview,closingIntro:search.closingIntro,storyTitle:copy.title.replace('Online booking software','Appointment scheduling'),sections:[...sections,{heading:extra.heading,paragraphs:extra.paragraphs}],extraFaqs:[...extra.faqs,...search.faqs]}];
}));
