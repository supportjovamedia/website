// The legacy branch exists only to let code deploy before the single-salon migration.
// No request may fall back after finding an installed single-salon settings table.
export function settingsTable(salon) { return salon.single ? 'salon_settings' : 'businesses'; }
export function adminsTable(salon) { return salon.single ? 'admin_users' : 'business_members'; }
export function scope(query, salon) { return salon.single ? query : query.eq('business_id', salon.id); }
export function ownership(salon) { return salon.single ? {} : {business_id: salon.id}; }
export function recordColumns(columns, salon) { return salon.single ? columns.split(',').filter(name => name !== 'business_id').join(',') : columns; }
export function salonFields(record, salon) { return {...record, slug: salon.slug}; }
