import test from "node:test";
import assert from "node:assert/strict";
import { compareBookingCosts } from "../lib/booking-costs.mjs";
import { articles, sources, articleSchema, articleDates, editorialDate } from "../lib/insights.mjs";
import { editorialAnchors, productionAnalyticsHost } from "../lib/editorial-routes.mjs";
import { publicPage, replaySafeUrl } from "../lib/marketing-analytics.mjs";

const example = { appointmentPrice:60, newClients:20, commissionPercent:35, monthlySubscription:0, customBuild:2000, customMonthly:20 };
test("booking comparison separates acquisition commission, subscription and first-year build costs",()=>{
  assert.deepEqual(compareBookingCosts(example), {commission:420,platformMonth:420,platformYear:5040,customYear:2240,difference:2800});
  assert.deepEqual(compareBookingCosts({...example,commissionPercent:0,monthlySubscription:40}), {commission:0,platformMonth:40,platformYear:480,customYear:2240,difference:-1760});
  assert.equal(compareBookingCosts({...example,newClients:0,monthlySubscription:0}).platformYear,0);
});
test("invalid calculator inputs cannot produce misleading cost outputs",()=>{
  for(const [key,value] of [["appointmentPrice",NaN],["newClients",Infinity],["customBuild",-1],["commissionPercent",101],["newClients",10001],["customMonthly",100001]]) assert.equal(compareBookingCosts({...example,[key]:value}),null,`${key}: ${value}`);
});
test("editorial routes permit known headings without exposing arbitrary fragments or private paths",()=>{
  for(const article of articles){
    const path=`/insights/${article.slug}`;
    assert.equal(publicPage(path),true);
    assert.deepEqual(editorialAnchors[path],article.blocks.filter(b=>b.type==="heading").map(b=>b.id));
    for(const id of editorialAnchors[path]) assert.equal(replaySafeUrl(`https://www.jovamedia.com${path}#${id}`),true);
    assert.equal(replaySafeUrl(`https://www.jovamedia.com${path}#customer-email`),false);
    assert.equal(replaySafeUrl(`https://www.jovamedia.com${path}?email=private`),false);
  }
  assert.equal(publicPage('/insights/private-client-record'),false);
  assert.equal(publicPage('/work/qaiser-watches'),true);
});
test("local and preview hosts cannot initialize production analytics",()=>{
  for(const host of ['localhost','127.0.0.1','website-preview.vercel.app','www.jovamedia.com.example.org','']) assert.equal(productionAnalyticsHost(host),false,host);
  for(const host of ['www.jovamedia.com','jovamedia.com']) assert.equal(productionAnalyticsHost(host),true,host);
});
test("published articles keep unique paths, accurate dates, valid sources and complete related links",()=>{
  assert.equal(new Set(articles.map(a=>a.slug)).size,7);
  for(const article of articles){
    const schema=articleSchema(article,`https://www.jovamedia.com/insights/${article.slug}/opengraph-image`);
    assert.equal(schema.datePublished,articleDates(article).publishedAt);
    assert.equal(schema.dateModified,articleDates(article).updatedAt);
    assert.equal(schema.headline,article.title);
    assert.equal(schema.mainEntityOfPage,`https://www.jovamedia.com/insights/${article.slug}`);
    for(const slug of article.related) assert.ok(articles.some(a=>a.slug===slug),slug);
    for(const block of article.blocks) for(const id of block.sources||block.ids||[]) assert.ok(sources[id],id);
    assert.doesNotMatch(JSON.stringify(article),new RegExp(String.fromCharCode(8212)));
  }
});
test("new publication dates do not change the existing article history",()=>{
  const original=articles.find(article=>article.slug==='salon-booking-platform-fees-vs-own-website');
  const added=articles.find(article=>article.slug==='custom-salon-booking-system-investment');
  assert.deepEqual(articleDates(original),{publishedAt:editorialDate,updatedAt:editorialDate});
  assert.deepEqual(articleDates(added),{publishedAt:'2026-10-21',updatedAt:'2026-10-21'});
  assert.deepEqual(articleDates({...added,updatedAt:'2026-10-22'}),{publishedAt:'2026-10-21',updatedAt:'2026-10-22'});
});
