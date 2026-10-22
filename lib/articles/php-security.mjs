export const phpSecuritySources = {
  "phpArticle1Source1": {
    "title": "PHP security advisory, 21 October 2026",
    "url": "https://www.php.net/archive/2026.php#2026-10-21-5"
  },
  "phpArticle1Source2": {
    "title": "CERT-EU Security Advisory 2026-018",
    "url": "https://cert.europa.eu/publications/security-advisories/2026-018"
  },
  "phpArticle1Source3": {
    "title": "Palo Alto Networks Unit 42 threat brief, 21 October 2026",
    "url": "https://unit42.paloaltonetworks.com/cve-2026-109618-cve-2026-109619/"
  },
  "phpArticle1Source4": {
    "title": "WordPress.com statement, 21 October 2026",
    "url": "https://wordpress.com/blog/2026/10/21/php2shell-vulnerabilities/"
  },
  "phpArticle1Source5": {
    "title": "Cloudflare response, 21 October 2026",
    "url": "https://blog.cloudflare.com/php-vulnerabilities-waf-protection/"
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
  },
  "phpArticle2Source4": {
    "title": "Cloudflare response, 21 October 2026",
    "url": "https://blog.cloudflare.com/php-vulnerabilities-waf-protection/"
  },
  "phpArticle3Source1": {
    "title": "WordPress technical requirements",
    "url": "https://wordpress.org/about/requirements/"
  },
  "phpArticle3Source2": {
    "title": "AWS PHP security bulletin, 21 October 2026",
    "url": "https://aws.amazon.com/security/security-bulletins/2026-143-aws/"
  },
  "phpArticle3Source3": {
    "title": "Google Cloud PHP incident response, 21 October 2026",
    "url": "https://cloud.google.com/blog/products/identity-security/responding-to-core-php-vulnerabilities-cve-2026-109618-cve-2026-109619"
  },
  "phpArticle3Source4": {
    "title": "PHP supported versions, checked 22 October 2026",
    "url": "https://www.php.net/supported-versions.php"
  },
  "phpArticle3Source5": {
    "title": "WordPress security hardening handbook",
    "url": "https://developer.wordpress.org/advanced-administration/security/hardening/"
  },
  "phpArticle3Source6": {
    "title": "WordPress upgrade handbook",
    "url": "https://developer.wordpress.org/advanced-administration/upgrade/upgrading/"
  },
  "phpArticle3Source7": {
    "title": "CERT-EU Security Advisory 2026-018",
    "url": "https://cert.europa.eu/publications/security-advisories/2026-018"
  },
  "phpArticle3Source8": {
    "title": "OWASP web application security guidance",
    "url": "https://owasp.org/projects/top-ten"
  }
};

export const phpSecurityArticles = [
  {
    "slug": "php2shell-website-shutdowns",
    "seoTitle": "PHP2Shell: PHP Security Fixes and Website Shutdowns | JovaMedia",
    "category": "Website security",
    "cover": "phpSecurity",
    "keyword": "PHP2Shell website shutdowns",
    "description": "What the October 2026 PHP2Shell emergency means for PHP and WordPress sites, why some services went offline and which security updates matter.",
    "summary": "What happened, why some operators took websites offline and what the evidence actually says about WordPress.",
    "answer": "PHP2Shell affects the PHP runtime beneath website applications. Operators need the relevant server update or a documented vendor fix. A precautionary shutdown is not proof of a breach, and the incident does not mean every WordPress or booking website was hacked.",
    "title": "PHP2Shell and the Emergency Behind the Website Shutdowns",
    "publishedAt": "2026-10-22",
    "layout": "longform",
    "contents": [
      "what-actually-went-wrong",
      "why-some-websites-were-taken-offline",
      "the-scale-is-large-but-exposure-is-not-a-count-of-hacked-sites",
      "wordpress-was-affected-without-every-wordpress-site-going-down",
      "the-update-that-matters-is-underneath-the-website"
    ],
    "related": [
      "ai-php-security-emergency",
      "php-wordpress-booking-website-security"
    ],
    "blocks": [
      {
        "type": "paragraph",
        "text": "A website can disappear because somebody broke into it. It can also disappear because its operator is trying to stop that happening. The PHP security emergency of October 2026 has made that distinction important for anyone whose business depends on online enquiries, payments or bookings.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "On 21 October, the PHP project released fixes for two critical vulnerabilities known as PHP2Shell. Under exploitable conditions, they can let an attacker run code on an affected server without logging in. The flaws sit in PHP itself, beneath applications such as WordPress.",
        "sources": [
          "phpArticle1Source1"
        ]
      },
      {
        "type": "paragraph",
        "text": "The response has included urgent patching and precautionary shutdowns. That is serious enough without turning it into a claim that every WordPress site, or every booking website, has been hacked.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "what-actually-went-wrong",
        "title": "What actually went wrong"
      },
      {
        "type": "paragraph",
        "text": "PHP is software that runs on a web server and helps generate pages and process requests. Many business owners use it without ever seeing its name in their website editor.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "The newly disclosed flaws are CVE-2026-109618 and CVE-2026-109619. Both concern unsafe handling of internal memory when a request fails. One involves data left partly initialised after an out-of-memory interruption; the other involves references to memory that has already been released. PHP's advisory identifies Apache with mod_php as the highest-risk configuration, while other PHP web deployments also require attention.",
        "sources": [
          "phpArticle1Source1"
        ]
      },
      {
        "type": "paragraph",
        "text": "For a business owner, the practical concern is that a flaw below the website application can undermine an otherwise well-maintained site. Updating a page, changing an administrator password or installing a new theme does not replace the server fix.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "why-some-websites-were-taken-offline",
        "title": "Why some websites were taken offline"
      },
      {
        "type": "paragraph",
        "text": "CERT-EU advised immediate patching and said organisations unable to do so should consider isolating internet-facing applications until the fix is applied and verified. Unit 42 also reported that at least one European government had taken its website offline as a precaution.",
        "sources": [
          "phpArticle1Source2",
          "phpArticle1Source3"
        ]
      },
      {
        "type": "paragraph",
        "text": "A precautionary shutdown does not establish that a successful intrusion occurred. It means an operator judged that temporary disruption was preferable to leaving a potentially exposed service accessible.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "That distinction matters when a client asks whether their details have been stolen. An unavailable booking page alone cannot answer that question. Neither can a working homepage prove that the underlying server is safe.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "the-scale-is-large-but-exposure-is-not-a-count-of-hacked-sites",
        "title": "The scale is large but exposure is not a count of hacked sites"
      },
      {
        "type": "paragraph",
        "text": "Unit 42 said its telemetry identified more than 22.6 million exposed instances that were potentially vulnerable. Those are potentially exposed instances, not 22.6 million confirmed compromises, businesses or offline websites.",
        "sources": [
          "phpArticle1Source3"
        ]
      },
      {
        "type": "paragraph",
        "text": "A sensible reading of the evidence separates three things: a vulnerable installation, an attempt to exploit it, and a confirmed compromise. Counting one as another can make a serious incident sound more certain than the evidence allows.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "The same caution applies to booking services. Booking is a function, not a programming language. Two sites offering appointments may use entirely different software and hosting arrangements.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "wordpress-was-affected-without-every-wordpress-site-going-down",
        "title": "WordPress was affected without every WordPress site going down"
      },
      {
        "type": "paragraph",
        "text": "WordPress runs on PHP, which explains why the incident matters to its users. But WordPress software and the WordPress.com hosting service are different things.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "On 21 October, WordPress.com said its hosted sites were already protected and that customers did not need to take action for these particular vulnerabilities. It attributed that protection to infrastructure work with the PHP Security team. That statement does not automatically cover a WordPress installation at another host.",
        "sources": [
          "phpArticle1Source4"
        ]
      },
      {
        "type": "paragraph",
        "text": "The useful question is therefore specific: has the provider responsible for this website's PHP installation applied and verified the relevant fix?",
        "sources": []
      },
      {
        "type": "heading",
        "id": "the-update-that-matters-is-underneath-the-website",
        "title": "The update that matters is underneath the website"
      },
      {
        "type": "paragraph",
        "text": "The PHP project's fixed releases are 8.5.12, 8.4.27, 8.3.36 and 8.2.35. Hosting providers may also deliver documented vendor-backported fixes, so the package's security status matters alongside its visible version number.",
        "sources": [
          "phpArticle1Source1"
        ]
      },
      {
        "type": "paragraph",
        "text": "A firewall can add protection, but it should not become an excuse to postpone remediation. Cloudflare says it deployed PHP2Shell protections for customers using its WAF and still recommends patching PHP. It also explicitly warns that updating application code or plugins alone does not fix these runtime flaws.",
        "sources": [
          "phpArticle1Source5"
        ]
      },
      {
        "type": "paragraph",
        "text": "If your business depends on the site, ask for confirmation of the patch, the deployment it covers and whether the service has been checked after the update. For an unavailable booking journey, provide a temporary contact route on a separate channel you control.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "The most useful outcome from this emergency is a clear answer about your own system. A provider's confirmed remediation tells you far more than a circulating claim that the whole web is down.",
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
        "text": "[Palo Alto Networks Unit 42 threat brief, 21 October 2026](https://unit42.paloaltonetworks.com/cve-2026-109618-cve-2026-109619/)",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "[WordPress.com statement, 21 October 2026](https://wordpress.com/blog/2026/10/21/php2shell-vulnerabilities/)",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "[Cloudflare response, 21 October 2026](https://blog.cloudflare.com/php-vulnerabilities-waf-protection/)",
        "sources": []
      }
    ]
  },
  {
    "slug": "ai-php-security-emergency",
    "seoTitle": "AI and the PHP Security Emergency: What Happened | JovaMedia",
    "category": "AI & security",
    "cover": "aiSecurity",
    "keyword": "AI PHP security emergency",
    "description": "How AI assisted PHP vulnerability research, why coordinated disclosure became urgent and what website owners can learn from the PHP2Shell response.",
    "summary": "AI helped uncover serious PHP weaknesses. The race to investigate, patch and protect websites still depended on people.",
    "answer": "AI helped researchers discover and investigate critical PHP weaknesses. That does not establish that AI created the bugs or powered every attack. The response shows why faster research needs clear responsibility for validating reports, deploying fixes and checking the running system.",
    "title": "How AI Helped Find the PHP Flaws and Complicated the Race to Fix Them",
    "publishedAt": "2026-10-22",
    "layout": "longform",
    "contents": [
      "ai-helped-researchers-demonstrate-the-danger",
      "part-of-the-problem-had-been-noticed-years-earlier",
      "more-findings-also-create-more-work",
      "the-public-timeline-moved-faster-than-planned",
      "attack-attempts-were-observed-but-their-origin-remains-uncertain",
      "ai-is-changing-the-speed-of-security-work"
    ],
    "related": [
      "php2shell-website-shutdowns",
      "php-wordpress-booking-website-security"
    ],
    "blocks": [
      {
        "type": "paragraph",
        "text": "The easiest version of the PHP2Shell story is that AI attacked the internet. The documented sequence is more revealing. AI helped researchers investigate serious weaknesses, maintainers prepared fixes, and defenders had to get those fixes into use while information about the vulnerabilities escaped into public view.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "ai-helped-researchers-demonstrate-the-danger",
        "title": "AI helped researchers demonstrate the danger"
      },
      {
        "type": "paragraph",
        "text": "OpenAI says security company Calif identified a critical PHP flaw using GPT-5.6 Sol through its Patch the Planet initiative. It also credits Wiz with independently discovering and reporting both vulnerabilities, while PHP's maintainers led the fixes and release.",
        "sources": [
          "phpArticle2Source1"
        ]
      },
      {
        "type": "paragraph",
        "text": "That is evidence of AI helping with discovery and investigation. It does not establish that AI created the bugs or that every subsequent attacker used an AI tool.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "Finding a weakness and showing how it can affect a real application are also different achievements. A suspicious piece of code needs investigation before anyone can establish its reach, assess the damage it could enable and decide how to repair it.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "part-of-the-problem-had-been-noticed-years-earlier",
        "title": "Part of the problem had been noticed years earlier"
      },
      {
        "type": "paragraph",
        "text": "The PHP Foundation says early signs of the out-of-memory problem were found in 2024, following an external audit. Competing fixes, compatibility concerns, limited specialist capacity and decision-making problems delayed resolution.",
        "sources": [
          "phpArticle2Source2"
        ]
      },
      {
        "type": "paragraph",
        "text": "The Foundation calls the delay a structural failure. Later reports clarified the remote-code-execution impact and made the fix a priority.",
        "sources": [
          "phpArticle2Source2"
        ]
      },
      {
        "type": "paragraph",
        "text": "That history challenges the idea that spotting bugs is the whole security job. Even when a concern has been identified, a maintainable fix needs people with deep knowledge of the software, time to investigate consequences and a process that can reach a decision.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "AI can help examine code faster. It cannot make those organisational responsibilities disappear.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "more-findings-also-create-more-work",
        "title": "More findings also create more work"
      },
      {
        "type": "paragraph",
        "text": "The Foundation reports 15 CVEs since 1 July and more than 100 invalid, duplicate or unreproducible reports. AI assists validation, but people make the decisions and work on patches.",
        "sources": [
          "phpArticle2Source2"
        ]
      },
      {
        "type": "paragraph",
        "text": "That is a useful warning for businesses considering automated security tools. A tool producing more alerts has not necessarily made a website safer. Somebody still needs to determine which findings are real, which systems are exposed and whether a proposed fix works.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "A convincing AI explanation is not a substitute for a reproducible finding or a verified update.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "the-public-timeline-moved-faster-than-planned",
        "title": "The public timeline moved faster than planned"
      },
      {
        "type": "paragraph",
        "text": "The Foundation says circulating CVE identifiers prompted an earlier announcement and a release on 21 October instead of 22 October. A mistakenly published demonstration video also accelerated public proof-of-concept development.",
        "sources": [
          "phpArticle2Source2"
        ]
      },
      {
        "type": "paragraph",
        "text": "Once identifying information starts spreading, defenders cannot assume that everyone else is waiting for the official release. Providers need time to package and deploy fixes, while operators need to know which services they must update.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "The business risk sits in that interval between a weakness becoming usable and a verified fix reaching the running system.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "attack-attempts-were-observed-but-their-origin-remains-uncertain",
        "title": "Attack attempts were observed but their origin remains uncertain"
      },
      {
        "type": "paragraph",
        "text": "Amazon Threat Intelligence reports a PHP2Shell exploitation attempt in its MadPot honeypot telemetry on 17 October, before public disclosure. It says the source used commercial anonymisation infrastructure and that the targeting suggested a threat actor, while acknowledging uncertainty about how the actor obtained the information.",
        "sources": [
          "phpArticle2Source3"
        ]
      },
      {
        "type": "paragraph",
        "text": "Amazon also reported later attempts and said it remained unclear whether those attempts would have succeeded against real-world systems.",
        "sources": [
          "phpArticle2Source3"
        ]
      },
      {
        "type": "paragraph",
        "text": "This is meaningful evidence of hostile activity. It is not proof of a particular AI system attacking websites, an identified criminal group or a confirmed worldwide compromise. Those conclusions require additional evidence.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "ai-is-changing-the-speed-of-security-work",
        "title": "AI is changing the speed of security work"
      },
      {
        "type": "paragraph",
        "text": "OpenAI argues that increasingly capable models can help both defenders finding vulnerabilities and attackers developing exploits. In its account of this incident, researchers and providers used the advance warning to prepare fixes and protections.",
        "sources": [
          "phpArticle2Source1"
        ]
      },
      {
        "type": "paragraph",
        "text": "Cloudflare says it observed attack traffic against customers and attackers altering payloads to try to get around its protections. That demonstrates adaptation during the response, without establishing which tools the attackers used.",
        "sources": [
          "phpArticle2Source4"
        ]
      },
      {
        "type": "paragraph",
        "text": "For website owners, the practical consequence is faster decision-making backed by evidence. Know who receives security alerts, who can deploy an urgent update and who checks that it is running correctly. A developer, hosting provider and business owner should not discover during an emergency that each expected somebody else to act.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "The PHP incident shows what AI-assisted research can uncover. Whether that discovery protects a business depends on the human work that follows it.",
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
      },
      {
        "type": "paragraph",
        "text": "[Cloudflare response, 21 October 2026](https://blog.cloudflare.com/php-vulnerabilities-waf-protection/)",
        "sources": []
      }
    ]
  },
  {
    "slug": "php-wordpress-booking-website-security",
    "seoTitle": "PHP, WordPress and Booking Website Security | JovaMedia",
    "category": "Website maintenance",
    "cover": "bookingSecurity",
    "keyword": "PHP WordPress booking website security",
    "description": "A practical guide to PHP and WordPress updates, booking journey tests, backups and recovery for salons and other appointment-based businesses.",
    "summary": "The questions to ask about updates, bookings, backups and recovery when your business depends on its website.",
    "answer": "Confirm who maintains the PHP runtime, website application and booking service. Verify that fixes reach the running deployment, then test the customer and staff booking journeys. A custom build can suit your workflow, but still needs maintenance, backups and a recovery plan.",
    "title": "What the PHP Emergency Means for Your Business Website and Booking System",
    "publishedAt": "2026-10-22",
    "layout": "longform",
    "contents": [
      "start-by-finding-out-what-your-website-runs-on",
      "a-recent-version-still-needs-the-right-security-update",
      "plan-beyond-the-next-emergency",
      "keep-the-server-and-the-website-application-in-view",
      "test-a-booking-rather-than-just-a-page",
      "give-downtime-an-owner-and-a-fallback",
      "a-custom-build-still-needs-maintenance"
    ],
    "related": [
      "php2shell-website-shutdowns",
      "custom-salon-booking-system-investment"
    ],
    "blocks": [
      {
        "type": "paragraph",
        "text": "Imagine a salon's homepage loading perfectly while its appointment form fails. A client can see the treatments, choose a stylist and decide to book, then leave without an appointment. The business may not notice until someone calls.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "That possibility explains why maintenance needs to cover the work customers come to do, rather than simply checking that the homepage opens.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "The October PHP2Shell emergency has brought server security into that conversation. For businesses using PHP or WordPress, it is an immediate reason to verify patching and a useful opportunity to examine how the whole website is maintained.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "start-by-finding-out-what-your-website-runs-on",
        "title": "Start by finding out what your website runs on"
      },
      {
        "type": "paragraph",
        "text": "Ask your provider which software handles your site and booking process, where it is hosted and who maintains each part. If the booking service is supplied by another company, it may have a separate infrastructure and update process.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "WordPress currently recommends PHP 8.3 or greater. Its requirements page also warns that older versions it can still run on have reached end of life and may expose sites to vulnerabilities. Compatibility is therefore a different question from security support.",
        "sources": [
          "phpArticle3Source1"
        ]
      },
      {
        "type": "paragraph",
        "text": "A website continuing to work on an old runtime should not be mistaken for evidence that the runtime remains a sensible long-term choice.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "a-recent-version-still-needs-the-right-security-update",
        "title": "A recent version still needs the right security update"
      },
      {
        "type": "paragraph",
        "text": "For the current PHP incident, AWS's advisory lists fixed releases for the supported 8.2, 8.3, 8.4 and 8.5 branches. Its guidance stresses that upgrading to a patched release is the complete fix; interim configuration controls do not fully remove the risk.",
        "sources": [
          "phpArticle3Source2"
        ]
      },
      {
        "type": "paragraph",
        "text": "This is why “we use PHP 8” is an incomplete answer. Ask which release or vendor security package is running on the actual service. A downloaded update and a deployed update are different stages of the job.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "Google Cloud's incident guidance illustrates that distinction: some supported services update automatically, while other deployments require customers to rebuild or redeploy their applications. Being on a major cloud platform does not settle who must act.",
        "sources": [
          "phpArticle3Source3"
        ]
      },
      {
        "type": "heading",
        "id": "plan-beyond-the-next-emergency",
        "title": "Plan beyond the next emergency"
      },
      {
        "type": "paragraph",
        "text": "PHP publishes a support timetable. As of 22 October 2026, PHP 8.2 is scheduled to receive security support until 31 December 2026, while 8.3 is supported for security fixes until 31 December 2027.",
        "sources": [
          "phpArticle3Source4"
        ]
      },
      {
        "type": "paragraph",
        "text": "If an old booking plugin blocks an upgrade, treat that as a maintenance problem to resolve. Identify whether it can be updated, replaced or rebuilt, and test the change before it reaches customers. Repeatedly postponing upgrades leaves the business dependent on a component that may be getting harder to support.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "keep-the-server-and-the-website-application-in-view",
        "title": "Keep the server and the website application in view"
      },
      {
        "type": "paragraph",
        "text": "The latest PHP flaws affect the runtime, but ordinary WordPress maintenance still matters. WordPress's own hardening guidance discusses hosting, access controls, trusted plugin sources, backups, logging and monitoring as parts of reducing risk.",
        "sources": [
          "phpArticle3Source5"
        ]
      },
      {
        "type": "paragraph",
        "text": "Ask for an inventory of the plugins, themes and integrations the business actually needs. Each should have an identifiable purpose and maintenance route. Keep administrator access limited to people who need it, and make sure responsibility for updates is written down.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "Performance also deserves diagnosis rather than a guess about the programming language. If a booking page is slow, measure where the delay occurs: loading the page, checking availability, waiting for a payment provider or saving the appointment. That gives a developer something specific to investigate.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "test-a-booking-rather-than-just-a-page",
        "title": "Test a booking rather than just a page"
      },
      {
        "type": "paragraph",
        "text": "After an update, a useful business acceptance test follows the customer journey. Can a client choose a service and available time, submit the required details and receive a confirmation? If deposits are enabled, does an authorised test payment produce the correct booking and payment record?",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "Then check the staff view. The appointment should appear once, with the correct date, service and customer details. Rescheduling and cancellation should behave as intended. These are practical checks we recommend because they test the outcome the business relies on.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "WordPress recommends backing up before updates and verifying that backups are usable. For a booking business, also decide how new appointments taken since a backup would be reconciled if restoration became necessary. A successful restore should not leave staff unsure which diary is current.",
        "sources": [
          "phpArticle3Source6"
        ]
      },
      {
        "type": "heading",
        "id": "give-downtime-an-owner-and-a-fallback",
        "title": "Give downtime an owner and a fallback"
      },
      {
        "type": "paragraph",
        "text": "Agree who notices failures, who investigates them and who can approve a temporary closure. If exposure cannot be fixed promptly, CERT-EU advises considering isolation of internet-facing applications until remediation is applied and verified.",
        "sources": [
          "phpArticle3Source7"
        ]
      },
      {
        "type": "paragraph",
        "text": "Keep an alternative contact route available outside the affected service. Staff need a way to record temporary bookings without accidentally offering the same slot twice. Customers need a short, accurate service message rather than speculation about hackers.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "If there are signs of intrusion, preserve relevant records and involve the hosting provider or an incident-response specialist. Applying a patch should not be treated as proof that any earlier compromise has been investigated.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "a-custom-build-still-needs-maintenance",
        "title": "A custom build still needs maintenance"
      },
      {
        "type": "paragraph",
        "text": "Choosing bespoke software can make it easier to tailor booking rules and remove unnecessary features. It does not make the result immune to security problems. A custom PHP system still depends on PHP, and a system built with another language has its own dependencies and operational responsibilities.",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "When comparing suppliers, ask how updates, testing, backups and recovery are handled alongside the feature list. OWASP's web security guidance applies across application technologies, reinforcing why a language choice alone cannot stand in for a security review.",
        "sources": [
          "phpArticle3Source8"
        ]
      },
      {
        "type": "paragraph",
        "text": "For your next website discussion, bring the questions that matter to the working business: who keeps it current, how is a real booking tested, and how quickly can it recover? JovaMedia can discuss those requirements alongside the design and features your business needs.",
        "sources": []
      },
      {
        "type": "heading",
        "id": "sources",
        "title": "Sources"
      },
      {
        "type": "paragraph",
        "text": "[WordPress technical requirements](https://wordpress.org/about/requirements/)",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "[AWS PHP security bulletin, 21 October 2026](https://aws.amazon.com/security/security-bulletins/2026-143-aws/)",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "[Google Cloud PHP incident response, 21 October 2026](https://cloud.google.com/blog/products/identity-security/responding-to-core-php-vulnerabilities-cve-2026-109618-cve-2026-109619)",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "[PHP supported versions, checked 22 October 2026](https://www.php.net/supported-versions.php)",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "[WordPress security hardening handbook](https://developer.wordpress.org/advanced-administration/security/hardening/)",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "[WordPress upgrade handbook](https://developer.wordpress.org/advanced-administration/upgrade/upgrading/)",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "[CERT-EU Security Advisory 2026-018](https://cert.europa.eu/publications/security-advisories/2026-018)",
        "sources": []
      },
      {
        "type": "paragraph",
        "text": "[OWASP web application security guidance](https://owasp.org/projects/top-ten)",
        "sources": []
      }
    ]
  }
];
