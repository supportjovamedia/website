import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
export const alt = "JovaMedia — Your Digital Partner. Creative digital agency, London.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image() {
  const [logo, portrait] = await Promise.all([
    readFile(path.join(process.cwd(), "public/brand/jova-logo.png")),
    readFile(path.join(process.cwd(), "public/share/home-hero.png")),
  ]);
  return new ImageResponse(
    <div style={{width:"100%",height:"100%",display:"flex",background:"#FDFFFC",color:"#020100",fontFamily:"sans-serif"}}>
      <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",width:720,padding:"45px 48px"}}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={"data:image/png;base64,"+logo.toString("base64")} width={154} height={80} alt="JovaMedia"/>
        <div style={{display:"flex",flexDirection:"column"}}>
          <span style={{fontSize:18,letterSpacing:2,color:"#235789",marginBottom:24}}>CREATIVE DIGITAL AGENCY</span>
          <span style={{fontSize:82,fontWeight:700,letterSpacing:-4,lineHeight:1.08,color:"#235789"}}>JOVA</span>
          <span style={{fontSize:76,fontWeight:700,letterSpacing:-4,lineHeight:1.12}}>Your Digital</span>
          <span style={{fontSize:76,fontWeight:700,letterSpacing:-4,lineHeight:1.12}}>Partner.</span>
        </div>
        <span style={{fontSize:19,color:"#414641"}}>London, UK · Thinking beyond borders</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={"data:image/png;base64,"+portrait.toString("base64")} width={480} height={630} alt="" style={{objectFit:"cover"}}/>
    </div>,
    size,
  );
}
