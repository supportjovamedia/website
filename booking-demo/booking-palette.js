/* Stable service colours for every calendar view. No booking data is changed. */
(() => {
  'use strict';
  const colours=[
    {fill:'#f5c6e9',ink:'#512946',edge:'#da8cc3'},
    {fill:'#cdc1f6',ink:'#3d3261',edge:'#a18bdf'},
    {fill:'#b7e7f1',ink:'#204b57',edge:'#76bfd0'},
    {fill:'#ffddb5',ink:'#634426',edge:'#e4b57b'},
    {fill:'#c5ead3',ink:'#2c513d',edge:'#89c19d'}
  ];
  function colour(booking){
    const key=String(booking?.serviceId||booking?.serviceName||'booking');
    let hash=2166136261;for(const char of key){hash^=char.codePointAt(0);hash=Math.imul(hash,16777619)>>>0;}hash=(hash^(hash>>>16))>>>0;
    return colours[hash%colours.length];
  }
  const style=booking=>{const c=colour(booking);return `--event-fill:${c.fill};--event-ink:${c.ink};--event-edge:${c.edge}`;};
  window.JovaBookingPalette={colour,style};
})();
