import {industryIntents} from './jovabook-industry-intents.mjs';

const contextImages={
  "barbers": "barber",
  "hair-salons": "salon",
  "nail-salons": "room",
  "spas": "spa",
  "medical-spas": "room",
  "tanning-salons": "room",
  "pilates-instructors": "booking",
  "mental-health-practitioners": "room",
  "lash-and-brow-artists": "room",
  "massage-therapists": "spa",
  "yoga-instructors": "booking",
  "tattoo-artists": "booking",
  "salons-and-barbers": "barber",
  "beauty-and-nails": "room",
  "tutors": "tutor",
  "personal-trainers": "fitness",
  "clinics": "room",
  "online-booking": "booking"
};

export const industrySearch=Object.fromEntries(Object.entries(industryIntents).map(([slug,copy])=>[slug,{contextImage:contextImages[slug],...copy}]));
