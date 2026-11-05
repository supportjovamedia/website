import JovaBookLanding from "./JovaBookLanding";
import {jovabookStructuredData} from "./search-data.mjs";
import {faqs} from "./faqs.mjs";
import "./navigation-integration.css";

export default function JovaBookHome(){
  return <><JovaBookLanding faqs={faqs}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jovabookStructuredData({faqs,video:{duration:"PT1M23S",uploadDate:"2026-11-05T00:00:00+00:00"}})).replace(/</g,"\\u003c")}}/></>;
}
