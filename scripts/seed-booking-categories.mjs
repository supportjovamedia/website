import {db, rows} from '../lib/booking/server.mjs';

const c = db();
const business = await rows(c.from('businesses').select('id').eq('slug', 'north-and-co').single());
const demo = [
  {name: 'Cuts', services: [['Signature haircut'], ['Skin fade']]},
  {name: 'Grooming', services: [['Haircut & beard'], ['Beard shape']]},
  {name: 'Rituals', services: [['Scalp ritual', 2000, 20], ['Hot towel shave', 2500, 30]]},
];
const staff = await rows(c.from('staff').select('id').eq('business_id', business.id).eq('active', true));
for (const [sort_order, group] of demo.entries()) {
  const existing = await rows(c.from('service_categories').select('*').eq('business_id', business.id).eq('name', group.name));
  const category = existing[0] || await rows(c.from('service_categories').insert({business_id: business.id, name: group.name, sort_order}).select().single());
  for (const [name, price_pence, duration_minutes] of group.services) {
    const services = await rows(c.from('services').select('*').eq('business_id', business.id).eq('name', name));
    const service = services[0]
      ? await rows(c.from('services').update({category_id: category.id}).eq('business_id', business.id).eq('id', services[0].id).select().single())
      : await rows(c.from('services').insert({business_id: business.id, category_id: category.id, name, price_pence, duration_minutes, buffer_minutes: 5, active: true}).select().single());
    // Only the new demonstration services need staff assignments.
    if (!services.length) await rows(c.from('staff_services').upsert(staff.map(person => ({business_id: business.id, staff_id: person.id, service_id: service.id}))));
  }
}
console.log('North & Co. demo ready: Cuts, Grooming and Rituals, with two services each. Existing booking and service IDs preserved.');
