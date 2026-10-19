// Browser captures of the editable HTML/CSS studies in design/system-studies.
// These are design concepts with fictional sample data, not client results.
const types = {
  'booking-systems': { type: 'booking', scenes: ['Booking calendar on a laptop with a mobile appointment confirmation', 'Weekly booking calendar on a graphite laptop', 'Customer service and appointment-time selection', 'Team working hours and booking availability', 'Appointment confirmation and reminder preferences', 'Daily appointments with confirmation statuses', 'Service durations and online-booking visibility'] },
  'crm-systems': { type: 'crm', scenes: ['CRM enquiry pipeline on a laptop with a mobile client record', 'Client-management pipeline with enquiry stages and assigned next actions', 'Client record with project notes and follow-up tasks', 'Team task list with enquiry follow-ups and due dates', 'Client contact directory with ownership and enquiry stages', 'Enquiry activity and follow-up overview', 'Website enquiry workflow with record creation and team assignment'] },
  'customer-portals': { type: 'portal', scenes: ['Client project portal on a laptop with mobile design review', 'Project portal with milestones, documents and a review request', 'Client design approval screen and feedback checklist', 'Project document library with file categories and access status', 'Private project conversation between a client and design team', 'Project timeline showing milestones and the next client decision', 'Client portal members, roles and project access controls'] },
  'membership-websites': { type: 'membership', scenes: ['Member library on a laptop with mobile learning progress', 'Membership home with learning resources and a live session', 'Member lesson screen with saved learning progress', 'Member events and live-session registration list', 'Member account details and notification preferences', 'Member resource library with guides and saved workbooks', 'Membership access overview and account management'] },
};
const views = ['card', 'hero', 'scope-one', 'scope-two', 'scope-three', 'editorial-one', 'editorial-two'];
export const systemPhotos = Object.fromEntries(Object.values(types).flatMap(({ type, scenes }) => views.map((view,index) => [
  `system-${type}-${view}`,
  { src: `/websites/systems/${type}-${view}.webp`, width: 1600, height: 1000, alt: `${scenes[index]}, interface design concept with sample data`, kind: 'interface', theme: type },
])));
export const systemMedia = Object.fromEntries(Object.entries(types).map(([slug, { type }]) => [slug, {
  cardPhoto: `system-${type}-card`,
  heroPhotos: [`system-${type}-hero`],
  storyPhotos: ['scope-one','scope-two','scope-three'].map(view => `system-${type}-${view}`),
  editorialPhotos: ['editorial-one','editorial-two'].map(view => `system-${type}-${view}`),
}]));
