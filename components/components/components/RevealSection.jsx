"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function RevealSection({ children }) {
  const ref = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 60 },
        { opacity: 1, y: 0, duration: 1.1, ease: "power2.out", scrollTrigger: { trigger: ref.current, start: "top 88%" } }
      );
    });
    return () => ctx.revert();
  }, []);

  return <div ref={ref}>{children}</div>;
}
