import './referrals-finish.css';

export default function ReferralsPreview(){
 return <section className="rf-referrals js-wrap" id="ex-referral" data-story-section aria-labelledby="rf-referral-title">
  <div className="rf-referral-card">
   <div className="rf-referral-copy">
    <span className="rf-referral-label">Refer a business</span>
    <h2 id="rf-referral-title">Share JovaBook.<br/>Earn a month free.</h2>
    <p>Refer three businesses that complete a qualifying paid month.</p>
    <a className="rf-referral-action" href="https://book.jovamedia.com/?portal=owner#referrals">View referrals in your dashboard</a>
   </div>
   <div className="rf-referral-reward" aria-label="Three qualifying referrals earn one free base month">
    <h3>Three qualifying referrals</h3>
    <ol className="rf-referral-steps" aria-hidden="true"><li>1</li><li>2</li><li>3</li></ol>
    <div className="rf-referral-ticket" aria-hidden="true">
     <svg className="rf-referral-gift" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 29h40v28H12zM7 19h50v12H7zM32 20v37M32 19C14 20 16 2 24 7c5 3 8 12 8 12Zm0 0C50 20 48 2 40 7c-5 3-8 12-8 12Z"/></svg>
     <strong>One<br/>month free.</strong>
    </div>
   </div>
  </div>
  <details className="rf-referral-terms">
   <summary>How referrals work</summary>
   <p>New, distinct businesses must use your link or code before account creation, complete a paid monthly Solo or Team cycle and pass an eligibility review. Joining Free alone does not qualify. Self-referrals, duplicates and refunded, failed or disputed qualifying payments are excluded.</p>
   <p>Annual invoices are excluded. Rewards apply one at a time to an eligible monthly renewal. Extra seats, message packs and other charges remain payable. Paid subscriptions return to their normal price afterwards. Free members receive a Solo month without starting an automatically renewing subscription. Referrers see the referred business name and progress, not client or payment details.</p>
  </details>
 </section>;
}
