export function groupServices(services, categories = [], includeEmpty = false) {
  const groups = [...categories]
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    .map(category => ({...category, services: services.filter(service => service.category_id === category.id)}));
  const known = new Set(categories.map(category => category.id));
  const other = services.filter(service => !known.has(service.category_id));
  if (other.length) groups.push({id: 'uncategorised', name: categories.length ? 'Other services' : 'Services', services: other});
  return includeEmpty ? groups : groups.filter(group => group.services.length);
}
