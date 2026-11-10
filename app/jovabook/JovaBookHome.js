import JovaBookLanding from "./story/Landing";
import {jovabookStructuredData} from "./search-data.mjs";
import {faqs} from "./faqs.mjs";
import {jovabookDemo} from "../../lib/jovabook-demo.mjs";
import "./navigation-integration.css";

export default function JovaBookHome(){
  return <><JovaBookLanding faqs={faqs}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jovabookStructuredData({faqs,video:jovabookDemo})).replace(/</g,"\\u003c")}}/></>;
}
