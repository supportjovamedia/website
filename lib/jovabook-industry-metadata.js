import {pageMetadata} from './seo';

export function bookingGuideMetadata(path,item){
 const metadata=pageMetadata(path,item.searchTitle||item.title,item.description||item.heroIntro||item.intro);
 const title=`${item.searchTitle||item.title} | JovaBook`;
 const image={url:'/share/jovabook-free-plans-2026-11.png',width:1200,height:630,alt:'JovaBook booking calendar and online booking page'};
 return {
  ...metadata,title:{absolute:title},
  robots:{index:true,follow:true,googleBot:{index:true,follow:true,'max-snippet':-1,'max-image-preview':'large'}},
  openGraph:{...metadata.openGraph,title,images:[image]},
  twitter:{...metadata.twitter,title,images:[image]},
 };
}
