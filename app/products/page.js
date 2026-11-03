import ProductsCatalogue from "./ProductsCatalogue";
import {pageMetadata} from "@/lib/seo";
import StructuredData from "@/components/StructuredData";
export const metadata=pageMetadata("/products","JovaBook, Websites & Business Services | JovaMedia","Explore JovaBook, three website packages, system modernisation, email marketing and automation, and search and local visibility from JovaMedia.");
export default async function ProductsPage({searchParams}){
 const params=await searchParams;
 const category=["products","websites","services"].includes(params?.category)?params.category:"products";
 return <><ProductsCatalogue key={category} initialCategory={category}/><StructuredData data={{"@context":"https://schema.org","@type":"ItemList",name:"JovaMedia products, website packages and business services",itemListElement:[
  ["JovaBook","/jovabook"],["Landing Page","/websites/landing-pages"],["Business Website","/websites/business-websites"],["Website with Booking System","/websites/booking-systems"],["System modernisation","/services/system-modernization"],["Email marketing and automation","/services/email-marketing"],["Search and local visibility","/services/seo"]
 ].map(([name,path],index)=>({"@type":"ListItem",position:index+1,name,url:`https://www.jovamedia.com${path}`}))}}/></>;
}
