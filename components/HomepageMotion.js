'use client';

import { useEffect } from 'react';
import styles from './HomepageMotion.module.css';

export default function HomepageMotion() {
  useEffect(() => {
    const hero = document.querySelector('[aria-labelledby="jova-hero-title"]');
    const main = hero?.closest('main');
    if (!hero || !main) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = matchMedia('(hover: hover) and (pointer: fine)');
    let teardown = () => {};

    function setup() {
      teardown();
      if (reduced.matches) return;
      const sections = [...main.querySelectorAll('h2, figure, [data-motion-order], [data-motion-group="values"] > div')];
      const photos = [...main.querySelectorAll('figure')];
      const cards = [...main.querySelectorAll('a[href^="/services/"]')];
      const buttons = [...main.querySelectorAll('a.btn')];
      for (const [index, card] of cards.entries()) {
        card.classList.add(styles.card);
        card.style.setProperty('--entry-x', index % 2 ? '26px' : '-26px');
        card.style.setProperty('--entry-angle', index % 2 ? '3deg' : '-3deg');
      }
      for (const button of buttons) button.classList.add(styles.button);
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.style.setProperty('--reveal-delay', `${Number(entry.target.dataset.motionOrder || 0) * 100}ms`);
            entry.target.classList.remove(styles.pending);
            observer.unobserve(entry.target);
          }
        }
      }, { threshold: .08, rootMargin: '0px 0px -30px 0px' });
      for (const section of sections) {
        section.classList.add(styles.reveal);
        if (section.getBoundingClientRect().top > innerHeight) {
          section.classList.add(styles.pending);
          observer.observe(section);
        }
      }
      for (const photo of photos) photo.classList.add(styles.photo);

      let frame = 0;
      let x = 0;
      let y = 0;
      const paint = () => {
        frame = 0;
        const rect = hero.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, -rect.top / rect.height));
        hero.style.setProperty('--art-x', `${x * 15}px`);
        hero.style.setProperty('--art-y', `${y * 9 + progress * 42}px`);
        hero.style.setProperty('--mascot-y', `${-progress * 35}px`);
        hero.style.setProperty('--art-rotate', `${x * 1.8}deg`);
        hero.style.setProperty('--art-scale', `${1 + progress * .045}`);
        for (const photo of photos) {
          const bounds = photo.getBoundingClientRect();
          if (bounds.bottom < 0 || bounds.top > innerHeight) continue;
          const position = (innerHeight / 2 - (bounds.top + bounds.height / 2)) / innerHeight;
          photo.style.setProperty('--photo-y', `${Math.max(-25, Math.min(25, position * 55))}px`);
        }
      };
      const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
      const move = event => {
        if (!pointer.matches) return;
        const rect = hero.getBoundingClientRect();
        x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
        y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
        schedule();
      };
      const leave = () => { x = 0; y = 0; schedule(); };
      hero.addEventListener('pointermove', move, { passive: true });
      hero.addEventListener('pointerleave', leave);
      window.addEventListener('scroll', schedule, { passive: true });
      schedule();
      teardown = () => {
        observer.disconnect();
        cancelAnimationFrame(frame);
        hero.removeEventListener('pointermove', move);
        hero.removeEventListener('pointerleave', leave);
        window.removeEventListener('scroll', schedule);
        for (const section of sections) {
          section.classList.remove(styles.reveal, styles.pending);
          section.style.removeProperty('--reveal-delay');
        }
        for (const photo of photos) { photo.classList.remove(styles.photo); photo.style.removeProperty('--photo-y'); }
        for (const card of cards) {
          card.classList.remove(styles.card);
          card.style.removeProperty('--entry-x');
          card.style.removeProperty('--entry-angle');
        }
        for (const button of buttons) button.classList.remove(styles.button);
        for (const name of ['--art-x', '--art-y', '--art-rotate', '--art-scale', '--mascot-y']) hero.style.removeProperty(name);
      };
    }
    setup();
    reduced.addEventListener('change', setup);
    return () => { teardown(); reduced.removeEventListener('change', setup); };
  }, []);
  return null;
}
