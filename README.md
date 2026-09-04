# JovaMedia Next.js site

## Replace your existing project
Copy these files into the root of your existing JovaMedia repository. Keep your `.git` folder if you want to preserve Git history.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Before production
1. Replace any pricing guidance you do not want to publish.
2. The contact API currently validates and logs enquiries. Connect it to Resend, Formspree, HubSpot or your preferred email/CRM before relying on it for leads.
3. Review Privacy Policy and Terms with a qualified UK legal professional for your exact business setup and tools.
4. Add real case studies only when you have permission and evidence.
5. Push to GitHub. Vercel should deploy automatically if the repository is connected.

## Git commands
```bash
git add .
git commit -m "Rebuild JovaMedia website"
git push origin main
```
