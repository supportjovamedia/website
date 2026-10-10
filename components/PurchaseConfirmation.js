"use client";
import { useEffect } from "react";
import { removeFromBasket } from "@/lib/basket-store";
import { trackEvent } from "@/lib/marketing-analytics.mjs";
export default function PurchaseConfirmation({ order }) {
  useEffect(() => {
    // Test purchases never enter production revenue reports.
    function record() {
      if (order.test) return;
      const key = `jova-purchase-${order.reference}`;
      try { if (sessionStorage.getItem(key)) return; } catch { /* GA4 also deduplicates by transaction_id. */ }
      if (trackEvent("purchase", { transaction_id: order.reference, product_ids: order.productIds, value: order.amount / 100 })) {
        try { sessionStorage.setItem(key, "1"); } catch { /* Storage is optional for reporting. */ }
      }
    }
    order.productIds.forEach(removeFromBasket);
    record(); window.addEventListener("jova-analytics-ready", record);
    return () => window.removeEventListener("jova-analytics-ready", record);
  }, [order]);
  return null;
}
