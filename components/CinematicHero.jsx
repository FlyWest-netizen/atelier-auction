"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Compact 3D simplex noise, public-domain algorithm (Stefan Gustavson).
// Drives the slow, continuous surface displacement — a procedural stand-in
// for "AI-generated, never-repeating" motion, since a real diffusion model
// cannot render at 60fps.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const GRAD3 = [1,1,0,-1,1,0,1,-1,0,-1,-1,0,1,0,1,-1,0,1,1,0,-1,-1,0,-1,0,1,1,0,-1,1,0,1,-1,0,-1,-1];
class SimplexNoise {
  constructor(seed) {
    const random = mulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const n = Math.floor((i + 1) * random());
      const q = p[i]; p[i] = p[n]; p[n] = q;
    }
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }
  noise3D(xin, yin, zin) {
    const { perm, permMod12 } = this;
    const F3 = 1 / 3, G3 = 1 / 6;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const X0 = i - t, Y0 = j - t, Z0 = k - t;
    const x0 = xin - X0, y0 = yin - Y0, z0 = zin - Z0;
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
      else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
      else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
    } else {
      if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
      else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
      else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
    }
    const x1=x0-i1+G3, y1=y0-j1+G3, z1=z0-k1+G3;
    const x2=x0-i2+2*G3, y2=y0-j2+2*G3, z2=z0-k2+2*G3;
    const x3=x0-1+3*G3, y3=y0-1+3*G3, z3=z0-1+3*G3;
    const ii=i&255, jj=j&255, kk=k&255;
    let n0=0,n1=0,n2=0,n3=0;
    let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
    if (t0 >= 0) { const gi=permMod12[ii+perm[jj+perm[kk]]]*3; t0*=t0; n0=t0*t0*(GRAD3[gi]*x0+GRAD3[gi+1]*y0+GRAD3[gi+2]*z0); }
    let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
    if (t1 >= 0) { const gi=permMod12[ii+i1+perm[jj+j1+perm[kk+k1]]]*3; t1*=t1; n1=t1*t1*(GRAD3[gi]*x1+GRAD3[gi+1]*y1+GRAD3[gi+2]*z1); }
    let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
    if (t2 >= 0) { const gi=permMod12[ii+i2+perm[jj+j2+perm[kk+k2]]]*3; t2*=t2; n2=t2*t2*(GRAD3[gi]*x2+GRAD3[gi+1]*y2+GRAD3[gi+2]*z2); }
    let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
    if (t3 >= 0) { const gi=permMod12[ii+1+perm[jj+1+perm[kk+1]]]*3; t3*=t3; n3=t3*t3*(GRAD3[gi]*x3+GRAD3[gi+1]*y3+GRAD3[gi+2]*z3); }
    return 32 * (n0 + n1 + n2 + n3);
  }
}

export default function CinematicHero() {
  const sectionRef = useRef(null);
  const mountRef = useRef(null);
  const headlineRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const mount = mountRef.current;
    const section = sectionRef.current;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.055);

    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x050505, 1);
    mount.appendChild(renderer.domElement);

    const warmSpot = new THREE.SpotLight(0xffd9a8, 3.4, 20, Math.PI / 7, 0.6, 1.2);
    warmSpot.position.set(3, 4, 4);
    warmSpot.castShadow = true;
    scene.add(warmSpot);

    const coolRim = new THREE.DirectionalLight(0xaecbff, 1.1);
    coolRim.position.set(-4, 1, -3);
    scene.add(coolRim);

    scene.add(new THREE.HemisphereLight(0x33415c, 0x0a0a0a, 0.25));

    const detail = isMobile ? 4 : 6;
    const geo = new THREE.IcosahedronGeometry(1.55, detail);
    const basePositions = geo.attributes.position.array.slice();
    const mat = new THREE.MeshStandardMaterial({ color: 0xc9a876, metalness: 0.82, roughness: 0.28, emissive: 0x2a1f10, emissiveIntensity: 0.15 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    scene.add(mesh);

    const geo2 = new THREE.IcosahedronGeometry(0.7, isMobile ? 2 : 4);
    const mat2 = new THREE.MeshStandardMaterial({ color: 0x2c2c2e, metalness: 0.5, roughness: 0.5 });
    const mesh2 = new THREE.Mesh(geo2, mat2);
    mesh2.position.set(2.1, -0.6, -1.4);
    scene.add(mesh2);

    const particleCount = isMobile ? 160 : 420;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0xd8c9a3, size: 0.02, transparent: true, opacity: 0.35, depthWrite: false });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    const noise = new SimplexNoise(7);
    const clock = new THREE.Clock();
    let frameId;
    let active = true;

    function onResize() {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    function animate() {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (!prefersReduced) {
        const posAttr = geo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
          const ix = i * 3;
          const ox = basePositions[ix], oy = basePositions[ix + 1], oz = basePositions[ix + 2];
          const n = noise.noise3D(ox * 0.6 + t * 0.05, oy * 0.6 + t * 0.05, oz * 0.6 + t * 0.05);
          const scale = 1 + n * 0.12;
          posAttr.array[ix] = ox * scale;
          posAttr.array[ix + 1] = oy * scale;
          posAttr.array[ix + 2] = oz * scale;
        }
        posAttr.needsUpdate = true;
        geo.computeVertexNormals();

        mesh.rotation.y = t * 0.03;
        mesh.rotation.x = Math.sin(t * 0.02) * 0.08;
        mesh2.rotation.y = -t * 0.05;
        mesh2.position.y = -0.6 + Math.sin(t * 0.15) * 0.15;

        particles.rotation.y = t * 0.01;
        const pAttr = particleGeo.attributes.position;
        for (let i = 0; i < particleCount; i++) {
          pAttr.array[i * 3 + 1] += 0.0015;
          if (pAttr.array[i * 3 + 1] > 4) pAttr.array[i * 3 + 1] = -4;
        }
        pAttr.needsUpdate = true;

        camera.position.x = Math.sin(t * 0.05) * 0.15;
        camera.position.y = Math.cos(t * 0.04) * 0.1;
        camera.lookAt(0, 0, 0);
      }

      renderer.render(scene, camera);
    }
    animate();

    function handleVisibility() {
      if (document.hidden) { active = false; cancelAnimationFrame(frameId); }
      else if (!active) { active = true; animate(); }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    let st;
    if (!prefersReduced) {
      gsap.registerPlugin(ScrollTrigger);
      gsap.set(headlineRef.current, { opacity: 0, y: 14 });
      gsap.to(headlineRef.current, { opacity: 1, y: 0, duration: 2, delay: 0.4, ease: "power2.out" });

      st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=120%",
        pin: true,
        scrub: 1,
        onUpdate: (self) => {
          camera.position.z = 6 - self.progress * 1.6;
          mesh.rotation.y += 0.002;
          if (headlineRef.current) {
            gsap.set(headlineRef.current, { opacity: Math.max(0, 1 - self.progress * 1.3), y: -self.progress * 30 });
          }
        },
      });
    } else {
      gsap.set(headlineRef.current, { opacity: 1, y: 0 });
    }

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (st) st.kill();
      renderer.dispose();
      geo.dispose(); mat.dispose(); geo2.dispose(); mat2.dispose();
      particleGeo.dispose(); particleMat.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <section ref={sectionRef} style={{ position: "relative", height: "100vh", minHeight: 640, overflow: "hidden", background: "#050505" }}>
      <div ref={mountRef} style={{ position: "absolute", inset: 0 }} />

      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(5,5,5,0.35) 0%, rgba(5,5,5,0.05) 35%, rgba(5,5,5,0.05) 65%, rgba(5,5,5,0.55) 100%)",
        pointerEvents: "none",
      }} />

      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "22px 32px", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      }}>
        <span className="display" style={{ fontSize: 16, color: "#F5F1E8", letterSpacing: -0.2 }}>The Atelier Auction</span>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <a href="/" style={{ fontSize: 13, color: "rgba(245,241,232,0.75)" }}>Marketplace</a>
          <a href="/submit" style={{ fontSize: 13, color: "#050505", background: "#D8C9A3", padding: "9px 18px", borderRadius: 999, fontWeight: 600 }}>List a work</a>
        </div>
      </nav>

      <div ref={headlineRef} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", pointerEvents: "none", opacity: 0 }}>
        <h1 className="display" style={{ fontSize: "clamp(32px, 6vw, 68px)", color: "#F5F1E8", letterSpacing: -1, lineHeight: 1.05, margin: 0 }}>
          Step inside a living gallery
        </h1>
      </div>
    </section>
  );
}
