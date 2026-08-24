"use client";

import { animate } from "framer-motion";
import { useEffect, useState } from "react";

export function useCountUp(target: number, duration = 0.8) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, target, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [target, duration]);

  return value;
}
