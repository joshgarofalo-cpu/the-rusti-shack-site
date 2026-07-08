"use client";

import { useEffect, useRef } from "react";
import { useCart } from "./CartContext";

/** Empties the cart once, after an order is confirmed (post-payment). */
export default function ClearCartOnMount() {
  const { clear } = useCart();
  const done = useRef(false);
  useEffect(() => {
    if (!done.current) {
      done.current = true;
      clear();
    }
  }, [clear]);
  return null;
}
