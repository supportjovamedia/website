/* Appointment instructions reuse booking.notes; service descriptions are plain optional text. */
(() => {
 'use strict';
 const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 4h14v12H9l-4 4V4Z"/><path d="M8 8h8M8 12h5"/></svg>';
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const instructions=booking=>typeof booking?.notes==='string'?booking.notes.trim():'';
 const badge=booking=>instructions(booking)?'<span class="jb-instructions-badge" aria-label="Special instructions added">'+icon+'<span>Special instructions</span></span>':'';
 const section=booking=>instructions(booking)?'<section class="jb-special-instructions"><h3>'+icon+'Special instructions</h3><p>'+escape(instructions(booking))+'</p></section>':'';
 function fields(service){const text=typeof service.description==='string'?service.description:'';return '<label class="field">Description (optional)<textarea name="description" aria-label="Description (optional)" rows="4" maxlength="1000" aria-describedby="service-description-count" placeholder="Explain what is included in this service.">'+escape(text)+'</textarea><small id="service-description-count">'+text.length+' / 1,000 characters</small></label>';}
 function bind(form){if(!form)return;form.elements.description.addEventListener('input',()=>{form.querySelector('#service-description-count').textContent=form.elements.description.value.length+' / 1,000 characters';});}
 const calendarNote=booking=>instructions(booking)?'<span class="jb-calendar-note">Note</span>':'';
 window.JovaBookingContent={instructions,badge,section,fields,bind,calendarNote};
})();
