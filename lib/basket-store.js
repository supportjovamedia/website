"use client";
import { useSyncExternalStore } from "react";
import { productById, validBasket } from "./products.mjs";

const KEY = "jovamedia-basket-v1";
const EMPTY = "[]";
let fallback = EMPTY;
let memoryOnly = false;
function snapshot() { if (memoryOnly) return fallback; try { return localStorage.getItem(KEY) || fallback; } catch { return fallback; } }
function subscribe(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener("jova-basket", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("jova-basket", callback); };
}
export function readBasket(raw) { try { const ids = JSON.parse(raw); return validBasket(ids) ? ids : []; } catch { return []; } }
export function useBasket() { return readBasket(useSyncExternalStore(subscribe, snapshot, () => EMPTY)); }
function write(ids) {
  fallback = JSON.stringify(ids);
  try { localStorage.setItem(KEY, fallback); } catch { memoryOnly = true; }
  window.dispatchEvent(new Event("jova-basket"));
}
export function addToBasket(id) { const ids = readBasket(snapshot()); if (productById(id) && !ids.includes(id)) write([...ids, id]); }
export function removeFromBasket(id) { write(readBasket(snapshot()).filter(value => value !== id)); }
export function clearBasket() { write([]); }
