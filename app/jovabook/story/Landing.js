import ReferralsPreview from './ReferralsPreview';
import CustomerStories from './CustomerStories';
import SupportPreview from './SupportPreview';
import {OriginalHero, InteractiveBooking} from './OriginalSections';
import StoryFaq from './Faq';
import StoryInteractions from './StoryInteractions';
import WebsiteShowcase from './WebsiteShowcase';
import {sections, dialogs} from './sections.mjs';
import '../landing.css';
import './story.css';
import './rhythm.css';
import './polish.css';
import './website-showcase-polish.css';
import './controls-finish.css';
import './calculator-finish.css';
import './customer-stories.css';
import './content-finish.css';
import '../../../booking-demo/website-designs.css';
import './website-designs-showcase.css';

export default function StoryLanding() {
  return <main className="jovabook-story">
    <OriginalHero/>
    <div id="jova-story-concept">
      <div className="blend-sections">
        {sections.map((html, index) => {
          if (html.includes('id="ex-websites"')) return <WebsiteShowcase key={index}/>;
          if (html.includes('id="customer-stories-mount"')) return <div className="content-band content-band-stories" key={index}><CustomerStories/></div>;
          if (html.includes('id="referrals-preview-mount"')) return <div className="content-band content-band-referrals" key={index}><ReferralsPreview/></div>;
          if (html.includes('id="support-preview-mount"')) return <div className="content-band content-band-support" key={index}><SupportPreview/></div>;
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
