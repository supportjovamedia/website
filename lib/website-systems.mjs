// Browser captures of the editable HTML/CSS studies in design/system-studies-v2.
// These are design concepts with fictional sample data, not client results.
const types = {
  'booking-systems': { type: 'booking', scenes: ['Customer booking page with a salon photograph and service selection', 'Customer appointment date and time selection with a service summary', 'Customer service and appointment-time selection', 'Team working hours and booking availability', 'Appointment confirmation and reminder preferences', 'Daily appointments with confirmation statuses', 'Service durations and online-booking visibility'] },
  'crm-systems': { type: 'crm', scenes: ['Desktop CRM sales board with a dark navigation rail and enquiry stages', 'Searchable enquiry list with a client record, conversation notes and next action', 'Client record with project notes and follow-up tasks', 'Team task list with enquiry follow-ups and due dates', 'Client contact directory with ownership and enquiry stages', 'Enquiry activity and follow-up overview', 'Website enquiry workflow with record creation and team assignment'] },
  'customer-portals': { type: 'portal', scenes: ['Client project room with a photographic project cover, design review and files', 'Client document library with a selected design preview and feedback control', 'Client design approval screen and feedback checklist', 'Project document library with file categories and access status', 'Private project conversation between a client and design team', 'Project timeline showing milestones and the next client decision', 'Client portal members, roles and project access controls'] },
  'membership-websites': { type: 'membership', scenes: ['Photography course library with a lesson preview and saved chapter progress', 'Member resource library with photography lessons, workbooks and saved progress', 'Member lesson screen with saved learning progress', 'Member events and live-session registration list', 'Member account details and notification preferences', 'Member resource library with guides and saved workbooks', 'Membership access overview and account management'] },
};
const views = ['card', 'hero', 'scope-one', 'scope-two', 'scope-three', 'editorial-one', 'editorial-two'];
export const systemPhotos = Object.fromEntries(Object.values(types).flatMap(({ type, scenes }) => views.map((view,index) => [
  `system-${type}-${view}`,
  { src: `/websites/systems-v2/${type}-${view}.webp`, width: 1600, height: 1000, alt: `${scenes[index]}, interface design concept with sample data`, kind: 'interface', theme: type },
])));
export const systemMedia = Object.fromEntries(Object.entries(types).map(([slug, { type }]) => [slug, {
  cardPhoto: `system-${type}-card`,
  heroPhotos: [`system-${type}-hero`],
  storyPhotos: ['scope-one','scope-two','scope-three'].map(view => `system-${type}-${view}`),
  editorialPhotos: ['editorial-one','editorial-two'].map(view => `system-${type}-${view}`),
}]));
