/* eslint-disable @next/next/no-img-element -- ImageResponse requires a server-rendered image element. */
import { ImageResponse } from "next/og";
import { articleBySlug } from "@/lib/insights.mjs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
async function photograph(kind) {
  const files = { lashes: "lash-treatment-share.jpg", salon: "salon-interior-share.jpg", business: "qaiser-website-share.jpg" };
  if (!files[kind] && kind !== "launch") return null;
  const bytes = kind === "launch"
    ? await readFile(join(process.cwd(), "public", "service-editorial", "copywriting.jpg"))
    : await readFile(join(process.cwd(), "public", "insights", files[kind]));
  return `data:image/jpeg;base64,${bytes.toString("base64")}`;
}
export default async function Image({ params }) {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article) return new Response("Not found", { status: 404 });
  const photo = await photograph(article.cover);
  const cost = article.cover === "cost";
  const palette = { booking: ["#e9e4db", "#173326"], cost: ["#244b41", "#faf8ed"], lashes: ["#f3e8e8", "#512c39"], salon: ["#f4f0e8", "#413824"], business: ["#0b291c", "#faf8ed"], launch: ["#f4efe4", "#443c2c"] };
  const [background, color] = palette[article.cover];
  return new ImageResponse(<div style={{ display:"flex", width:"100%", height:"100%", background, color, fontFamily:"sans-serif" }}>
    <div style={{ display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"54px 46px", width:photo ? "55%" : "62%" }}><div style={{ display:"flex", fontSize:article.title.length>85 ? 45 : 51, fontWeight:700, lineHeight:1.16, letterSpacing:"-1.4px" }}>{article.title}</div><div style={{ display:"flex", fontSize:21 }}>JovaMedia · jovamedia.com</div></div>
    {photo ? <img src={photo} width={540} height={630} alt="" style={{ objectFit:"cover", objectPosition:article.cover === "business" ? "right top" : "center", width:"45%", height:"100%" }}/> : <div style={{ display:"flex", width:"38%", alignItems:"center", padding:"40px 35px 40px 0" }}><div style={{ display:"flex", flexDirection:"column", background:"#fffdf6", color:"#173326", padding:"32px", width:"100%" }}>{cost ? <div style={{display:"flex",flexDirection:"column"}}><div style={{display:"flex",fontSize:21,marginBottom:24}}>Starting build prices</div>{["Landing page · £350","Business site · £550","Booking site · £2,000"].map(line=><div key={line} style={{display:"flex",fontSize:23,padding:"16px 0",borderTop:"1px solid #d5dacd"}}>{line}</div>)}</div> : <div style={{display:"flex",flexDirection:"column"}}><div style={{display:"flex",fontSize:23}}>An appointment</div><div style={{display:"flex",fontSize:86,fontWeight:700,margin:"12px 0 25px"}}>£60</div><div style={{display:"flex",fontSize:22,lineHeight:1.6}}>35% commission: £21</div><div style={{display:"flex",fontSize:22,lineHeight:1.6}}>Before other costs: £39</div></div>}<div style={{display:"flex",fontSize:16,lineHeight:1.5,marginTop:20}}>{cost ? "Running costs separate." : "Illustration. VAT and other charges excluded."}</div></div></div>}
  </div>, size);
}
