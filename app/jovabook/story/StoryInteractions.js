"use client";
import {useEffect} from 'react';

export default function StoryInteractions() {
  useEffect(() => {
    let cancelled = false;
    let cleanup;
    import('./enhance-story').then(({enhanceStory}) => {
      if (cancelled) return;
      const host = document.getElementById('jova-story-concept');
      if (host) cleanup = enhanceStory(host);
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);
  return null;
}
