import {ImageResponse} from 'next/og';
export const alt='JovaMedia — Brands grow with purpose.';
export const size={width:1200,height:630};
export const contentType='image/png';
export default function Image(){return new ImageResponse(<div style={{background:'#FDFFFC',width:'100%',height:'100%',display:'flex',flexDirection:'column',padding:'65px 75px',color:'#020100',justifyContent:'space-between'}}><div style={{display:'flex',justifyContent:'space-between',fontSize:23}}><span>JOVA MEDIA</span><span style={{color:'#235789'}}>LONDON / DIGITAL AGENCY</span></div><div style={{display:'flex',flexDirection:'column',fontSize:100,lineHeight:1.05,letterSpacing:-5}}><span>Brands grow</span><span style={{color:'#235789'}}>with purpose.</span></div><div style={{fontSize:22,color:'#535d69'}}>Strategy / Creative / Media / Technology</div></div>,size)}
