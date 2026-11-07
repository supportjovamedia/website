import {OriginalHero, InteractiveBooking} from './OriginalSections';
import StoryFaq from './Faq';
import StoryInteractions from './StoryInteractions';
import {sections, dialogs} from './sections.mjs';
import '../landing.css';
import './story.css';
import './rhythm.css';

export default function StoryLanding() {
  return <main className="jovabook-story">
    <OriginalHero/>
    <div id="jova-story-concept">
      <div className="blend-sections">
        {sections.map((html, index) => {
          if (html.includes('id="booking-mount"')) {
            return <div id="booking-mount" key={index}><InteractiveBooking/></div>;
          }
          if (html.includes('id="faq-mount"')) {
            return <div id="ex-faq" key={index}><StoryFaq/></div>;
          }
          return <div className="story-fragment" key={index} dangerouslySetInnerHTML={{__html: html}}/>;
        })}
      </div>
      <div dangerouslySetInnerHTML={{__html: dialogs}}/>
    </div>
    <StoryInteractions/>
  </main>;
}
