'use client';

import {Check, ChevronDown, Scissors} from 'lucide-react';
import {groupServices} from '@/lib/booking/categories.mjs';

export default function ServiceMenu({services, categories, selected, currency, onSelect, phone}) {
  const groups = groupServices(services, categories);
  const money = value => new Intl.NumberFormat('en-GB', {style: 'currency', currency}).format(value / 100);
  return <>
    <div className="service-category-menu">
      {groups.map((group, index) => <details className="service-category" key={group.id} open={index === 0 || group.services.some(service => service.id === selected?.id)}>
        <summary><span><strong>{group.name}</strong><small>{group.services.length} {group.services.length === 1 ? 'service' : 'services'}</small></span><ChevronDown size={20} aria-hidden="true"/></summary>
        <div className="service-list">{group.services.map(service => <button type="button" aria-pressed={selected?.id === service.id} key={service.id} className={'service-choice ' + (selected?.id === service.id ? 'selected' : '')} onClick={() => onSelect(service)}>
          <span className="service-symbol"><Scissors size={21} aria-hidden="true"/></span><span><strong>{service.name}</strong><small>{service.duration_minutes} minutes</small></span><strong>{money(service.price_pence)}</strong><span className="radio">{selected?.id === service.id ? <Check size={13} aria-hidden="true"/> : null}</span>
        </button>)}</div>
      </details>)}
    </div>
    <p className="multiple-services-note">Booking more than one service? {phone ? <a href={'tel:' + phone}>Call the studio</a> : 'Contact the studio'} to arrange them together.</p>
  </>;
}
