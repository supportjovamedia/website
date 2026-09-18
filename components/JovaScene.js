'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import styles from './JovaScene.module.css';

export default function JovaScene() {
  const [greeting, setGreeting] = useState(false);
  const timeout = useRef(null);
  useEffect(() => () => clearTimeout(timeout.current), []);
  function greet() {
    if (greeting) return;
    setGreeting(true);
    timeout.current = setTimeout(() => setGreeting(false), 1500);
  }
  return <div className={styles.scene}>
    <div className={styles.browser}>
      <Image src="/campaign/jova-browser.png" alt="A floating JovaMedia website with blue, yellow and red accents" width={1484} height={1060} sizes="(max-width: 900px) 108vw, 760px" preload />
    </div>
    <div className={styles.character}>
      <button type="button" onClick={greet} className={`${styles.mascot} ${greeting ? styles.greeting : ''}`} aria-label="Say hello to Jova">
        <span className={styles.pose}>
          <Image src="/campaign/jova-wave.png" alt="" width={1280} height={1280} sizes="(max-width:900px) 31vw, 220px" className={greeting ? styles.hidden : ''} preload />
          <Image src="/campaign/jova-wink.png" alt="" width={1280} height={1280} sizes="(max-width:900px) 31vw, 220px" className={`${styles.wink} ${greeting ? '' : styles.hidden}`} />
        </span>
        <span className={styles.label} aria-live="polite">{greeting ? 'Hello!' : 'Say hello'}</span>
      </button>
    </div>
  </div>;
}
