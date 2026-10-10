import {db, rows} from '../lib/booking/server.mjs';

import {deploymentBusiness} from '../lib/booking/business.mjs';
import {scope,ownership} from '../lib/booking/store.mjs';
const c=db(),business=await deploymentBusiness(c);
if(business.slug!=='north-and-co')throw Error('This seed is for the North & Co. demonstration only');
const demo = [
  {name: 'Cuts', services: [['Signature haircut'], ['Skin fade']]},
  {name: 'Grooming', services: [['Haircut & beard'], ['Beard shape']]},
  {name: 'Rituals', services: [['Scalp ritual', 2000, 20], ['Hot towel shave', 2500, 30]]},
];
const staff = await rows(scope(c.from('staff').select('id'),business).eq('active', true));
for (const [sort_order, group] of demo.entries()) {
  const existing = await rows(scope(c.from('service_categories').select('*'),business).eq('name', group.name));
  const category = existing[0] || await rows(c.from('service_categories').insert({...ownership(business), name: group.name, sort_order}).select().single());
  for (const [name, price_pence, duration_minutes] of group.services) {
    const services = await rows(scope(c.from('services').select('*'),business).eq('name', name));
    const service = services[0]
      ? await rows(scope(c.from('services').update({category_id: category.id}),business).eq('id', services[0].id).select().single())
      : await rows(c.from('services').insert({...ownership(business), category_id: category.id, name, price_pence, duration_minutes, buffer_minutes: 5, active: true}).select().single());
    // Only the new demonstration services need staff assignments.
    if (!services.length) await rows(c.from('staff_services').upsert(staff.map(person => ({...ownership(business), staff_id: person.id, service_id: service.id}))));
  }
}
console.log('North & Co. demo ready: Cuts, Grooming and Rituals, with two services each. Existing booking and service IDs preserved.');
