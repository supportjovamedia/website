"use client";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useBasket } from "@/lib/basket-store";
import s from "./Commerce.module.css";
export default function BasketLink() {
  const ids = useBasket();
  return <Link className={s.navBasket} href="/basket" aria-label={`Basket, ${ids.length} ${ids.length === 1 ? "product" : "products"}`}><ShoppingBag size={19} aria-hidden="true" /><span>{ids.length}</span></Link>;
}
