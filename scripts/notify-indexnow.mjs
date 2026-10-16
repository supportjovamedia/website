import { readFile } from "node:fs/promises";

const host = "www.jovamedia.com";
const key = "7d5c4782613e4b8d895bdae2b7b30d1c";
const keyLocation = `https://${host}/${key}.txt`;
const args = process.argv.slice(2);
const submit = args.includes("--submit");
const inputs = args.filter(arg => arg !== "--submit");

if (!inputs.length) {
  console.error("Usage: node scripts/notify-indexnow.mjs [--submit] /updated-page [...]");
  console.error("Notify only genuinely new, changed or deleted public URLs. Default is a dry run.");
  process.exitCode = 1;
} else {
  try {
    if ((await readFile(new URL(`../public/${key}.txt`, import.meta.url), "utf8")).trim() !== key) {
      throw new Error("The local IndexNow verification file does not match the configured key.");
    }
    const urlList = [...new Set(inputs.map(input => {
      const url = new URL(input, `https://${host}`);
      if (url.protocol !== "https:" || url.hostname !== host || url.port || url.username || url.password || url.hash || url.search) {
        throw new Error(`Only canonical HTTPS URLs on ${host}, without queries or fragments, are accepted.`);
      }
      if (/^\/(?:api|admin|portal|preview)(?:\/|$)/.test(url.pathname)) {
        throw new Error("Do not submit API, account or preview URLs.");
      }
      return url.href;
    }))];
    if (urlList.length > 100) throw new Error("Submit at most 100 changed URLs per run.");
    if (!submit) {
      console.log(JSON.stringify({ mode: "dry-run", keyLocation, urlList }, null, 2));
    } else {
      const verification = await fetch(keyLocation, { redirect: "error", signal: AbortSignal.timeout(15000) });
      if (!verification.ok || (await verification.text()).trim() !== key) {
        throw new Error("The live key file is not verified. Deploy it before submitting URLs.");
      }
      const response = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, key, keyLocation, urlList }),
        signal: AbortSignal.timeout(20000),
      });
      if (![200, 202].includes(response.status)) {
        throw new Error(`IndexNow refused the batch (HTTP ${response.status}).`);
      }
      console.log(JSON.stringify({
        mode: "submitted", responseCode: response.status, keyFileVerified: true, urlList,
        note: response.status === 202
          ? "Received; engine-side key validation is pending. This is not confirmed indexing."
          : "Submission accepted. Crawling, indexing and rankings remain separate decisions.",
      }, null, 2));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
