export const phpSecuritySources = {
  "phpArticle1Source1": {
    "title": "PHP security advisory, 21 October 2026",
    "url": "https://www.php.net/archive/2026.php#2026-10-21-5"
  },
  "phpArticle1Source2": {
    "title": "CERT-EU Security Advisory 2026-018",
    "url": "https://cert.europa.eu/publications/security-advisories/2026-018"
  },
  "phpArticle1Source4": {
    "title": "WordPress.com statement, 21 October 2026",
    "url": "https://wordpress.com/blog/2026/10/21/php2shell-vulnerabilities/"
  },
  "phpArticle2Source1": {
    "title": "OpenAI account of the coordinated PHP response, 21 October 2026",
    "url": "https://openai.com/index/coordinated-disclosure-of-critical-vulnerabilities/"
  },
  "phpArticle2Source2": {
    "title": "The PHP Foundation account of discovery, remediation and disclosure, 21 October 2026",
    "url": "https://thephp.foundation/blog/2026/10/21/todays-php-security-release-and-how-were-strengthening-php-security/"
  },
  "phpArticle2Source3": {
    "title": "Amazon Threat Intelligence findings, 21 October 2026",
    "url": "https://aws.amazon.com/blogs/security/amazon-threat-intelligence-identifies-php2shell-exploitation-prior-to-public-disclosure-in-madpot/"
  }
};

export const phpSecurityArticles = [
  {
    "slug": "php2shell-website-shutdowns",
    "seoTitle": "PHP2Shell & Ageing Websites: Plan Your Next Update | JovaMedia",
    "category": "Website security",
    "cover": "phpSecurity",
    "keyword": "PHP website modernisation",
    "description": "The PHP2Shell emergency exposed how hard fragile websites can be to update. Learn when dependency updates, a phased migration or system modernisation can help.",
    "summary": "An urgent update becomes a business problem when nobody knows what will break. Here is how to get an ageing website moving forward.",
    "answer": "Address PHP2Shell with your hosting provider, then investigate the dependencies and access problems that make updates difficult. JovaMedia can assess targeted upgrades, phased migration or a rebuild through its system modernisation service.",
    "title": "PHP2Shell: What Happens When Your Website Cannot Be Updated",
    "publishedAt": "2026-10-22",
    "updatedAt": "2026-10-22",
    "layout": "longform",
    "contents": [
      "the-security-fix-sits-beneath-the-website",
      "a-shutdown-does-not-tell-the-whole-story",
      "the-warning-sign-is-an-upgrade-nobody-wants-to-attempt",
      "fix-the-immediate-exposure-then-remove-the-upgrade-blockers",
      "make-the-next-change-easier-to-release",
      "give-your-ageing-website-a-workable-next-step"
    ],
    "related": [
      "ai-php-security-emergency",
      "php-wordpress-booking-website-security"
    ],
    "blocks": [
      {
        "type": "paragraph",
        "text": "The message arrives halfway through the working day: your website needs an urgent security update. Then comes the complication. The booking plugin may stop working. The developer who built it has moved on. Nobody is sure whether the last backup can actually be restored.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "For a business owner, that is where a technical problem becomes an operational one. Customers still need to book, staff still need their records and the website cannot simply wait until things are quieter.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "The October 2026 PHP2Shell emergency has brought that problem into focus. It is a good reason to check the security update on your own site. It is also a reason to look closely at any system that has become too fragile to change.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "the-security-fix-sits-beneath-the-website",
        "title": "The security fix sits beneath the website"
      },
      {
        "type": "paragraph",
        "text": "On 21 October, PHP released fixes for two critical vulnerabilities, CVE-2026-109618 and CVE-2026-109619. Under exploitable conditions, they can allow someone to run code on an affected server without signing in. PHP identified Apache with mod_php as the highest-risk configuration and urged users serving web requests to update.",
        "sources": [
          "phpArticle1Source1"
        ]
      },
      {
        "type": "paragraph",
        "text": "PHP is the software running underneath many websites, including WordPress. You can replace the homepage photograph, install a new theme and change every administrator password while leaving that underlying software untouched.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "That is why a fresh-looking website can still depend on an installation that needs urgent attention. The design tells customers what your business looks like. It tells you very little about how easily the system can be maintained.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "a-shutdown-does-not-tell-the-whole-story",
        "title": "A shutdown does not tell the whole story"
      },
      {
        "type": "paragraph",
        "text": "Some operators chose to take services offline while addressing the risk. CERT-EU advised organisations unable to patch immediately to consider isolating exposed applications until remediation had been applied and verified. A temporary closure can therefore be a protective decision. It does not, by itself, prove that customer data has been stolen.",
        "sources": [
          "phpArticle1Source2"
        ]
      },
      {
        "type": "paragraph",
        "text": "Nor did every WordPress website go down. WordPress.com said its hosted sites were already protected against these specific vulnerabilities. A WordPress site at another provider needs confirmation from whoever maintains that installation.",
        "sources": [
          "phpArticle1Source4"
        ]
      },
      {
        "type": "paragraph",
        "text": "For your business, the useful answer is specific: which service was affected, what fix is running and who has verified it? General reassurance about “the hosting” leaves too much unanswered.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "the-warning-sign-is-an-upgrade-nobody-wants-to-attempt",
        "title": "The warning sign is an upgrade nobody wants to attempt"
      },
      {
        "type": "paragraph",
        "text": "An urgent update can expose problems that have been tolerated for years. Perhaps an old extension blocks newer software. Perhaps the live site is the only place changes can be tested. Perhaps nobody can explain which parts were custom-built and which depend on an outside supplier.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "Those problems make even ordinary improvements harder. A new payment option becomes a larger project than expected. A small form change needs repeated repairs. Staff learn to work around errors because getting them fixed feels more disruptive than living with them.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "This is where [JovaMedia's system modernisation service](/services/system-modernization) becomes relevant. We review the code, dependencies and everyday workflows before recommending changes. The aim is to understand what can be updated, what needs replacing and which parts of the existing system still serve the business well.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "That matters because you may have valuable customer records, useful integrations and years of working processes inside the current application. A sensible modernisation project takes those things seriously.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "fix-the-immediate-exposure-then-remove-the-upgrade-blockers",
        "title": "Fix the immediate exposure, then remove the upgrade blockers"
      },
      {
        "type": "paragraph",
        "text": "PHP's advisory identifies patched releases as 8.5.12, 8.4.27, 8.3.36 and 8.2.35. Some providers supply vendor-backported fixes, so the relevant package's security status also matters. Your hosting provider or developer should confirm what is actually deployed.",
        "sources": [
          "phpArticle1Source1"
        ]
      },
      {
        "type": "paragraph",
        "text": "Once the urgent issue is addressed, examine why the update was difficult. If a plugin prevented it, that dependency needs a plan. If access was missing, ownership needs sorting out. If a booking process could not be tested, the next release will face the same uncertainty.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "For a salon, that might mean replacing an unsupported booking extension while retaining the treatment menu and customer journey. For another business, it might mean updating the framework behind a customer portal or connecting an older application to a newer service.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "The scope should follow the problem. There is little value in paying for a complete rebuild when a focused upgrade will do the job. There is equally little value in repeatedly paying to repair a component that no longer has a workable future.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "make-the-next-change-easier-to-release",
        "title": "Make the next change easier to release"
      },
      {
        "type": "paragraph",
        "text": "A useful modernisation plan should explain how changes reach the live system. Where will they be tested? Which customer and staff tasks must still work? What happens if the release needs to be reversed?",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "JovaMedia works through agreed updates in a separate environment, tests them against the workflows your team uses and plans the rollout and recovery approach before release. We assess the technology and available source-code access first, so the proposed work reflects the system we can actually support.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "The benefit is practical: a clearer route to maintaining the application your business relies on. It also gives future improvements somewhere to start, rather than forcing your team to rediscover the same technical problems with every request.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "give-your-ageing-website-a-workable-next-step",
        "title": "Give your ageing website a workable next step"
      },
      {
        "type": "paragraph",
        "text": "If the explanation for keeping your website unchanged is “we are worried something will break”, it is time to investigate what is making it difficult to maintain.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "[Talk to JovaMedia about modernising your existing system](/services/system-modernization). Tell us what it does, which updates or changes are being avoided and where your team keeps getting stuck. We can assess whether targeted updates, a phased migration or a rebuild deserves further planning.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "You should be able to make a decision about your website with a clear view of the work involved, rather than waiting for the next urgent notice to make it for you. [Send us your website and the problem you want to solve](/contact).",
        "sources": []
      },
      {
        "type": "heading",
        "id": "sources",
        "title": "Sources"
      },
      {
        "type": "paragraph",
        "text": "[PHP security advisory, 21 October 2026](https://www.php.net/archive/2026.php#2026-10-21-5)",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "[CERT-EU Security Advisory 2026-018](https://cert.europa.eu/publications/security-advisories/2026-018)",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "[WordPress.com statement, 21 October 2026](https://wordpress.com/blog/2026/10/21/php2shell-vulnerabilities/)",
        "sources": []
      }
    ]
  },
  {
    "slug": "ai-php-security-emergency",
    "seoTitle": "AI, Website Security & System Modernisation | JovaMedia",
    "category": "AI & security",
    "cover": "aiSecurity",
    "keyword": "AI website security system modernisation",
    "description": "AI-assisted PHP research puts website maintenance in focus. See how clear ownership, tested releases and system modernisation help businesses act on security updates.",
    "summary": "A faster warning only helps if your business can act on it. The PHP response shows why maintainable software deserves attention.",
    "answer": "AI helped investigate critical PHP flaws, but protection still depended on people deploying and verifying fixes. Reviewing dependencies, access and release processes can help a business remove obstacles to updates and everyday improvements.",
    "title": "AI Is Finding Website Flaws Faster. Is Your Business Ready?",
    "publishedAt": "2026-10-22",
    "updatedAt": "2026-10-22",
    "layout": "longform",
    "contents": [
      "ai-helped-find-the-problem-people-had-to-deliver-the-fix",
      "the-bottleneck-can-be-the-system-you-already-own",
      "an-ai-report-is-the-start-of-an-investigation",
      "prepare-before-the-urgent-email-arrives",
      "modernisation-can-also-make-everyday-work-better",
      "find-out-what-would-slow-your-business-down"
    ],
    "related": [
      "php2shell-website-shutdowns",
      "php-wordpress-booking-website-security"
    ],
    "blocks": [
      {
        "type": "paragraph",
        "text": "How long would it take your business to update its website if a serious vulnerability were announced today?",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "An hour? A day? Or would the first few days disappear into finding the right login, contacting a former developer and trying to work out what the website runs on?",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "The PHP2Shell response offers a useful lesson for businesses watching the growth of AI. Finding a flaw faster only helps the defender who can turn that warning into a working fix. For an owner with an ageing website, the ability to act has become a business concern worth examining.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "ai-helped-find-the-problem-people-had-to-deliver-the-fix",
        "title": "AI helped find the problem. People had to deliver the fix"
      },
      {
        "type": "paragraph",
        "text": "OpenAI says Calif used GPT-5.6 Sol to identify a critical PHP flaw through its Patch the Planet initiative. Wiz independently reported both vulnerabilities, and PHP's maintainers led the fixes and release. That is a documented use of AI in security research, with a response involving several organisations.",
        "sources": [
          "phpArticle2Source1"
        ]
      },
      {
        "type": "paragraph",
        "text": "It does not establish that AI caused every outage or that every attacker used an AI tool. Those claims go beyond the evidence.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "The important business question is what happens after discovery. A fix must be prepared, distributed, installed and checked. Your particular application still needs to work when the update is running. That chain of work reaches all the way from the software maintainer to the people responsible for your website.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "the-bottleneck-can-be-the-system-you-already-own",
        "title": "The bottleneck can be the system you already own"
      },
      {
        "type": "paragraph",
        "text": "The PHP Foundation says early signs of one underlying problem were identified in 2024. Compatibility concerns, competing approaches and limited specialist resources contributed to delays. Later research clarified its remote-code-execution impact and made fixing it the priority.",
        "sources": [
          "phpArticle2Source2"
        ]
      },
      {
        "type": "paragraph",
        "text": "Small businesses can recognise a familiar pattern here without needing to understand PHP's internals. A problem is known, but changing it is difficult. Other work takes priority. The workaround becomes routine. Eventually something urgent makes the decision unavoidable.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "Your equivalent might be a booking plugin that only works with an old setup, a customer portal no one knows how to deploy, or a form connected to an account nobody controls. The issue has a technical name, but the delay often comes from access, compatibility and ownership.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "A [system modernisation review with JovaMedia](/services/system-modernization) starts by making those dependencies visible. We assess the current application and the work it supports, then agree which upgrades and improvements are realistic. That gives a business a route out of repeated postponement.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "an-ai-report-is-the-start-of-an-investigation",
        "title": "An AI report is the start of an investigation"
      },
      {
        "type": "paragraph",
        "text": "The PHP Foundation also describes a growing volume of security reports, including invalid, duplicate and unreproducible submissions. Its team uses AI to assist validation, while people make the decisions and work on patches.",
        "sources": [
          "phpArticle2Source2"
        ]
      },
      {
        "type": "paragraph",
        "text": "For a business buying website support, this is a useful distinction. A long report can look impressive while leaving the owner with no clear next action. A convincing explanation from an AI tool can still be wrong about the application in front of it.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "Ask what has been established. Which component is affected? Can the problem be reproduced? What change is proposed? How will the team check that the change solves it without breaking the booking, checkout or account journey?",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "Those questions turn a finding into work someone can assess and carry out. They also help you distinguish an important upgrade from an automated alert that needs more investigation.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "prepare-before-the-urgent-email-arrives",
        "title": "Prepare before the urgent email arrives"
      },
      {
        "type": "paragraph",
        "text": "Amazon Threat Intelligence reported a PHP2Shell exploitation attempt in its MadPot honeypot telemetry dated 17 October, before public disclosure. It said the origin of the actor's information remained unclear. This shows why the response timeline matters, without proving a particular AI-driven attack campaign.",
        "sources": [
          "phpArticle2Source3"
        ]
      },
      {
        "type": "paragraph",
        "text": "A practical response begins with knowing what your business runs and who can change it. Record the hosting provider, application, important extensions and external services. Confirm who controls the accounts and who receives security notices.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "Then establish how a release works. If testing means making a change on the live site and hoping for the best, the business has an avoidable obstacle to acting quickly. If every release depends on one person's memory, useful knowledge needs to be documented.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "Speed comes from preparation: access that works, a test environment, clear responsibilities and a recovery approach. Those are concrete things a business can improve now.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "modernisation-can-also-make-everyday-work-better",
        "title": "Modernisation can also make everyday work better"
      },
      {
        "type": "paragraph",
        "text": "The same review can uncover problems your team experiences every week. Staff may copy booking details into another tool. A manager may need three screens to change one record. Customers may keep calling because an online task is difficult to complete.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "JovaMedia's [system modernisation service](/services/system-modernization) covers dependency updates, interface improvements, supported integrations and data migration planning. We can scope changes in stages around the system and workflows you have, with compatibility checks before release.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "That is a stronger reason to invest than chasing a promise that new software can never be hacked. A more maintainable application can be easier to improve, while clearer interfaces and connected tools can remove specific frustrations from the working day. Each benefit should be tied to an agreed change you can review.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "find-out-what-would-slow-your-business-down",
        "title": "Find out what would slow your business down"
      },
      {
        "type": "paragraph",
        "text": "You do not need to become a security researcher to make a better decision about your website. You need to know whether the people responsible for it can identify a relevant problem, deploy a suitable update and verify the result.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "If you are unsure, [ask JovaMedia about a system modernisation project](/services/system-modernization). Start with the application you use, what your team needs it to do and any updates that have been put off. We will assess the technology and access before agreeing the work.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "[Send us the system you depend on and the changes you keep postponing](/contact). That is a useful first step towards making your next software decision on your own terms.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "sources",
        "title": "Sources"
      },
      {
        "type": "paragraph",
        "text": "[OpenAI account of the coordinated PHP response, 21 October 2026](https://openai.com/index/coordinated-disclosure-of-critical-vulnerabilities/)",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "[The PHP Foundation account of discovery, remediation and disclosure, 21 October 2026](https://thephp.foundation/blog/2026/10/21/todays-php-security-release-and-how-were-strengthening-php-security/)",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "[Amazon Threat Intelligence findings, 21 October 2026](https://aws.amazon.com/blogs/security/amazon-threat-intelligence-identifies-php2shell-exploitation-prior-to-public-disclosure-in-madpot/)",
        "sources": []
      }
    ]
  },
  {
    "slug": "php-wordpress-booking-website-security",
    "seoTitle": "Improve Your Salon Booking System & Website | JovaMedia",
    "category": "Website maintenance",
    "cover": "bookingSecurity",
    "keyword": "salon booking system improvements",
    "description": "A better salon booking journey starts with services, staff rules and reliable administration. Explore targeted upgrades and custom booking development with JovaMedia.",
    "summary": "From the first tap to the staff diary, your booking journey shapes the customer experience. Make it work around the way your salon runs.",
    "answer": "Follow the full appointment journey to identify friction for customers and staff. JovaMedia can scope a clearer connection to your current platform, modernise an ageing application or build a bespoke booking system around your agreed salon workflows.",
    "title": "Your Booking System Is Part of the Service You Sell",
    "publishedAt": "2026-10-22",
    "updatedAt": "2026-10-22",
    "layout": "longform",
    "contents": [
      "follow-the-appointment-all-the-way-into-the-diary",
      "separate-a-booking-problem-from-a-platform-problem",
      "the-php-emergency-makes-maintenance-part-of-the-decision",
      "build-around-the-appointments-you-actually-sell",
      "ownership-gives-you-decisions-to-make-for-your-own-business",
      "bring-us-the-booking-problem-your-team-keeps-working-around"
    ],
    "related": [
      "php2shell-website-shutdowns",
      "custom-salon-booking-system-investment"
    ],
    "blocks": [
      {
        "type": "paragraph",
        "text": "A client has chosen the treatment, checked your work and decided to book. Then the appointment page makes them start again. The service names are confusing, the available times do not make sense on their phone, or the confirmation never arrives.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "You have already done the hard work of earning their interest. The booking journey is where that interest should turn into an appointment in your diary.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "A salon website can look polished and still make that moment unnecessarily difficult. The recent PHP security emergency adds another question: can the software behind the booking be kept up to date without disrupting the business?",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "Together, those questions make a strong case for treating booking as part of the service you deliver, with the same attention you give to the salon itself.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "follow-the-appointment-all-the-way-into-the-diary",
        "title": "Follow the appointment all the way into the diary"
      },
      {
        "type": "paragraph",
        "text": "Picture a new client booking a colour service. They need to understand the treatment, choose an appropriate appointment and know what happens next. Staff need enough time allocated, the right person assigned and an accurate record of the booking.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "If any of those steps depends on a manual correction, the online journey has handed work back to the team. Reception may need to clarify the service, move the slot or chase information that could have been collected at the right point.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "Before buying another feature, follow one appointment from the customer's phone to the staff calendar. Then try a cancellation and a reschedule. That exercise can tell you more about the system's usefulness than a dashboard full of charts.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "Our [booking system development service](/websites/booking-systems) starts with those rules: service lengths, team availability, buffers, booking windows and the actions staff need to manage. The result should reflect how your business actually takes appointments.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "separate-a-booking-problem-from-a-platform-problem",
        "title": "Separate a booking problem from a platform problem"
      },
      {
        "type": "paragraph",
        "text": "A confusing treatment menu may need clearer wording. A poorly placed booking link may need a better page layout. Those changes do not necessarily require replacing a reliable calendar.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "An unsupported extension, inflexible scheduling rules or repeated failures after updates can point to a deeper problem. If the software cannot support the way you work, another cosmetic redesign leaves the same restrictions underneath.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "The distinction saves time and money. JovaMedia can assess a clearer connection to an existing booking tool, improvements to the current website, or a custom booking workflow. For ageing applications, [system modernisation](/services/system-modernization) provides a route to reviewing dependencies and planning targeted upgrades before deciding how much needs to change.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "You should be able to explain what the proposed work will improve for a customer or a member of staff. “A newer website” is too vague to be the whole brief.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "the-php-emergency-makes-maintenance-part-of-the-decision",
        "title": "The PHP emergency makes maintenance part of the decision"
      },
      {
        "type": "paragraph",
        "text": "PHP2Shell affected the PHP runtime beneath website applications. PHP's advisory called for patched releases or appropriate vendor fixes. Updating a WordPress theme alone does not update the server's PHP installation.",
        "sources": [
          "phpArticle1Source1"
        ]
      },
      {
        "type": "paragraph",
        "text": "That does not mean every WordPress booking page failed. WordPress.com said its hosted sites were protected against these particular flaws. Your own provider needs to confirm the position for the service you use.",
        "sources": [
          "phpArticle1Source4"
        ]
      },
      {
        "type": "paragraph",
        "text": "The lesson for a salon owner is straightforward: know who maintains each part of the booking journey. Your website, calendar, payment provider and reminder service may be operated by different companies. A working homepage cannot confirm that all of those connections are working correctly.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "When a supplier proposes a change, ask how the complete journey will be checked afterwards, including what appears in the staff diary.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "build-around-the-appointments-you-actually-sell",
        "title": "Build around the appointments you actually sell"
      },
      {
        "type": "paragraph",
        "text": "A short barber appointment, a consultation and a multi-stage colour service place different demands on a diary. You may need preparation time, a particular staff member, a room or equipment, or a rule about how far ahead a client can book.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "A custom system gives you the opportunity to define those requirements directly. At JovaMedia, that means planning the customer journey and the staff administration around the agreed brief, with a bespoke design rather than a pre-made website template.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "You can request a feature that matters to your business, such as a particular consultation step, a clearer staff calendar or a specific cancellation workflow. We assess the requirement and agree its scope and cost. It does not have to wait for a shared platform to decide the feature belongs on its product roadmap.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "Payment connections, deposits, reminders and migration need their own requirements and technical checks. Defining them early helps avoid the disappointment of discovering after launch that the feature you assumed was included works differently from what the salon needs.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "ownership-gives-you-decisions-to-make-for-your-own-business",
        "title": "Ownership gives you decisions to make for your own business"
      },
      {
        "type": "paragraph",
        "text": "JovaMedia's custom salon booking offer is a one-off £2,000 build, with hosting and domain at £240 a year. We charge no VAT on those amounts, so the first-year build, hosting and domain total is £2,240. Payment processing, messaging, maintenance and additional work are separate where applicable.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "You own the bespoke system permanently, with no recurring JovaMedia software licence or JovaMedia booking commission. The agreed features and handover should be recorded clearly, including the source code, business data and account access.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "Ownership gives you a basis for changing the system as the salon develops. It also means planning its upkeep. A custom build still needs updates and testing, and another programming language is not a promise of perfect security.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "For a fuller cost discussion, read our [custom salon booking investment guide](/insights/custom-salon-booking-system-investment). The right comparison uses your actual platform invoices and the features your team relies on, including the value of any clients a marketplace introduces.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "bring-us-the-booking-problem-your-team-keeps-working-around",
        "title": "Bring us the booking problem your team keeps working around"
      },
      {
        "type": "paragraph",
        "text": "Perhaps customers cannot choose the right service. Perhaps staff spend too long correcting appointments. Perhaps the current software needs an update that nobody wants to attempt.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "[Explore JovaMedia's booking system development service](/websites/booking-systems), then tell us where the process breaks down. We can assess whether your salon needs a clearer website journey, a targeted system update or a custom build.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "[Send us your booking link and the three things you want it to do better](/contact). It gives the project a useful starting point: the customer experience you want to deliver and the work your team wants to stop repeating.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "sources",
        "title": "Sources"
      },
      {
        "type": "paragraph",
        "text": "[PHP security advisory, 21 October 2026](https://www.php.net/archive/2026.php#2026-10-21-5)",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "[WordPress.com statement, 21 October 2026](https://wordpress.com/blog/2026/10/21/php2shell-vulnerabilities/)",
        "sources": []
      }
    ]
  }
];
