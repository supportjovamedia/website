"use client";
import {useRef,useState} from 'react';
import {jovabookDemo} from '../../../lib/jovabook-demo.mjs';

export default function DemoVideo(){
  const player=useRef(null),shell=useRef(null);
  const [started,setStarted]=useState(false);
  function play(){
    setStarted(true);
    shell.current.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    player.current.play().catch(()=>{});
  }
  return <div className="q4-demo-band" data-story-section><section className="ex-film js-wrap" id="ex-film">
    <div className="ex-film-title"><h2>Meet JovaBook.</h2><p>The booking journey, your management dashboard and the tools behind your day.</p></div>
    <div className="ex-video-shell" ref={shell} data-playing={started}>
      <video ref={player} id="jovabook-demo-player" controls playsInline preload="none" width="1920" height="1080" src={jovabookDemo.src} poster={jovabookDemo.poster} style={{display:started?'block':'none'}} onEnded={()=>setStarted(false)}>
        Your browser does not support video playback.
      </video>
      {!started&&<><img src={jovabookDemo.poster} loading="lazy" decoding="async" data-asset="poster" alt="JovaMedia surrounded by colourful booking and business icons" width="1920" height="1080"/>
        <button className="ex-play cursor-interaction" type="button" data-play-demo aria-label="Play JovaBook product demonstration" onClick={play}>
          <span className="ex-play-disc" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5a1 1 0 0 1 1.5-.86l10 6.5a1 1 0 0 1 0 1.72l-10 6.5A1 1 0 0 1 8 18.5Z"/></svg></span>
          <span>Watch the JovaBook demo</span>
        </button>
      </>}
    </div>
  </section></div>;
}
