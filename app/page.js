import JovaBookHome from "./jovabook/JovaBookHome";
import {jovabookMetadata} from "./jovabook/search-data.mjs";

export const metadata=jovabookMetadata();
export default function Home(){return <JovaBookHome/>;}
