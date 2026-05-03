
import { useRef, useState, useEffect, useMemo, Suspense } from "react";
import * as THREE from "three";

/* ─── tiny helpers ─────────────────────────────────────────────────────────── */
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const map = (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c);

/* ─── constants ────────────────────────────────────────────────────────────── */
const SECTIONS = ["home", "about", "work", "contact"];
const PROJECTS = [
  {
    id: 0,
    title: "Nebula OS",
    tag: "Systems Design",
    year: "2024",
    desc: "A reimagined operating system interface with spatial computing primitives and adaptive AI-driven window management.",
    color: "#a78bfa",
    accent: "#7c3aed",
    tech: ["C++", "OpenGL", "WASM", "WebGPU"],
  },
  {
    id: 1,
    title: "Depth Protocol",
    tag: "Real-Time 3D",
    year: "2024",
    desc: "Multiplayer simulation engine with deterministic physics, LOD streaming, and a custom ECS architecture for 10k+ entities.",
    color: "#34d399",
    accent: "#059669",
    tech: ["Rust", "WebRTC", "Three.js", "SIMD"],
  },
  {
    id: 2,
    title: "Synthesis AI",
    tag: "Machine Learning",
    year: "2023",
    desc: "Generative audio model trained on 2M samples. Real-time inference pipeline with sub-5ms latency on consumer hardware.",
    color: "#f472b6",
    accent: "#db2777",
    tech: ["PyTorch", "CUDA", "TensorRT", "ONNX"],
  },
  {
    id: 3,
    title: "Lattice Finance",
    tag: "FinTech",
    year: "2023",
    desc: "Decentralized derivatives protocol processing $1.2B monthly volume. Novel AMM curve with zero slippage on stable pairs.",
    color: "#fb923c",
    accent: "#ea580c",
    tech: ["Solidity", "Rust", "Go", "ZK Proofs"],
  },
];

/* ─── noise / math ──────────────────────────────────────────────────────────── */
function noise(x, y, t) {
  return (
    Math.sin(x * 1.2 + t * 0.4) * 0.5 +
    Math.sin(y * 0.8 + t * 0.3) * 0.3 +
    Math.sin((x + y) * 0.6 + t * 0.5) * 0.2
  );
}

/* ─── 3D Canvas ─────────────────────────────────────────────────────────────── */
function ThreeCanvas({ scrollY, activeSection, mouseX, mouseY }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({});
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.035);

    const camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      200
    );
    camera.position.set(0, 2, 10);
    camera.lookAt(0, 0, 0);

    /* ── lighting ── */
    const ambient = new THREE.AmbientLight(0x0a0a1a, 2);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0x9966ff, 3);
    sun.position.set(5, 10, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -15;
    scene.add(sun);

    const fillLight = new THREE.PointLight(0x00ffcc, 2, 30);
    fillLight.position.set(-5, 3, -3);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xff3366, 1.5, 20);
    rimLight.position.set(5, -2, -5);
    scene.add(rimLight);

    /* ── grid floor ── */
    const gridGeo = new THREE.PlaneGeometry(60, 60, 60, 60);
    const gridMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a1a,
      emissive: 0x110022,
      emissiveIntensity: 0.3,
      metalness: 0.8,
      roughness: 0.4,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -3;
    grid.receiveShadow = true;
    scene.add(grid);

    /* ── floating particles ── */
    const partCount = 800;
    const partPositions = new Float32Array(partCount * 3);
    const partSizes = new Float32Array(partCount);
    const partColors = new Float32Array(partCount * 3);
    const pallette = [
      new THREE.Color(0x7c3aed),
      new THREE.Color(0x00ffcc),
      new THREE.Color(0xff3366),
      new THREE.Color(0xffffff),
    ];
    for (let i = 0; i < partCount; i++) {
      partPositions[i * 3] = (Math.random() - 0.5) * 40;
      partPositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      partPositions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 5;
      partSizes[i] = Math.random() * 3 + 0.5;
      const c = pallette[Math.floor(Math.random() * pallette.length)];
      partColors[i * 3] = c.r;
      partColors[i * 3 + 1] = c.g;
      partColors[i * 3 + 2] = c.b;
    }
    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute("position", new THREE.BufferAttribute(partPositions, 3));
    partGeo.setAttribute("size", new THREE.BufferAttribute(partSizes, 1));
    partGeo.setAttribute("color", new THREE.BufferAttribute(partColors, 3));
    const partMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(partGeo, partMat);
    scene.add(particles);

    /* ── hero geometry: crystalline torus knot ── */
    const torusGeo = new THREE.TorusKnotGeometry(2, 0.6, 200, 32, 2, 3);
    const torusMat = new THREE.MeshStandardMaterial({
      color: 0x4c1d95,
      emissive: 0x2d1065,
      emissiveIntensity: 0.5,
      metalness: 1,
      roughness: 0.1,
    });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    torus.castShadow = true;
    scene.add(torus);

    /* ── satellite orbs ── */
    const orbGroup = new THREE.Group();
    const orbColors = [0x7c3aed, 0x00ffcc, 0xff3366, 0xf59e0b];
    const orbs = orbColors.map((c, i) => {
      const g = new THREE.SphereGeometry(0.2 + i * 0.05, 32, 32);
      const m = new THREE.MeshStandardMaterial({
        color: c,
        emissive: c,
        emissiveIntensity: 0.8,
        metalness: 0.9,
        roughness: 0.05,
      });
      const mesh = new THREE.Mesh(g, m);
      const angle = (i / orbColors.length) * Math.PI * 2;
      const r = 3.5 + i * 0.3;
      mesh.position.set(Math.cos(angle) * r, Math.sin(angle * 0.7) * 1.5, Math.sin(angle) * r * 0.6);
      orbGroup.add(mesh);
      return mesh;
    });
    scene.add(orbGroup);

    /* ── rings ── */
    for (let i = 0; i < 3; i++) {
      const rg = new THREE.TorusGeometry(3.2 + i * 0.8, 0.02, 16, 100);
      const rm = new THREE.MeshStandardMaterial({
        color: [0x7c3aed, 0x00ffcc, 0xff3366][i],
        emissive: [0x7c3aed, 0x00ffcc, 0xff3366][i],
        emissiveIntensity: 1,
        transparent: true,
        opacity: 0.5 - i * 0.1,
      });
      const ring = new THREE.Mesh(rg, rm);
      ring.rotation.x = Math.PI / 2 + i * 0.3;
      ring.rotation.z = i * 0.5;
      scene.add(ring);
    }

    stateRef.current = { renderer, scene, camera, torus, particles, orbGroup, grid, orbs, fillLight, rimLight };

    /* ── resize ── */
    const onResize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    /* ── animate ── */
    let t = 0;
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      t += 0.008;

      const sy = stateRef.current.scrollY || 0;
      const mx = stateRef.current.mouseX || 0;
      const my = stateRef.current.mouseY || 0;

      // torus
      torus.rotation.x = t * 0.3 + my * 0.3;
      torus.rotation.y = t * 0.5 + mx * 0.3;
      torus.position.y = Math.sin(t * 0.7) * 0.3;

      // scroll-driven camera
      const camTargetY = lerp(2, -2, clamp(sy / 3000, 0, 1));
      const camTargetZ = lerp(10, 6, clamp(sy / 2000, 0, 1));
      camera.position.y = lerp(camera.position.y, camTargetY + my * 0.5, 0.05);
      camera.position.z = lerp(camera.position.z, camTargetZ, 0.03);
      camera.position.x = lerp(camera.position.x, mx * 1.5, 0.05);
      camera.lookAt(0, 0, 0);

      // orbs
      orbGroup.rotation.y = t * 0.4;
      orbs.forEach((o, i) => {
        o.position.y = Math.sin(t * 0.8 + i * 1.5) * 1.5;
        const scale = 1 + Math.sin(t * 2 + i) * 0.15;
        o.scale.setScalar(scale);
      });

      // particles drift
      const pos = particles.geometry.attributes.position.array;
      for (let i = 0; i < partCount; i++) {
        pos[i * 3 + 1] += 0.005 * Math.sin(t + i * 0.1);
        pos[i * 3] += 0.002 * Math.cos(t * 0.5 + i * 0.07);
        if (pos[i * 3 + 1] > 10) pos[i * 3 + 1] = -10;
      }
      particles.geometry.attributes.position.needsUpdate = true;
      particles.rotation.y = t * 0.02;

      // grid pulse
      grid.material.opacity = 0.15 + Math.sin(t * 0.5) * 0.05;

      // lights pulse
      fillLight.intensity = 2 + Math.sin(t * 1.2) * 0.5;
      rimLight.intensity = 1.5 + Math.sin(t * 0.9 + 1) * 0.4;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    stateRef.current.scrollY = scrollY;
    stateRef.current.mouseX = mouseX;
    stateRef.current.mouseY = mouseY;
  }, [scrollY, mouseX, mouseY]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        display: "block",
      }}
    />
  );
}

/* ─── Custom Cursor ─────────────────────────────────────────────────────────── */
function Cursor({ x, y, hovering }) {
  return (
    <>
      <div
        style={{
          position: "fixed",
          left: x - 4,
          top: y - 4,
          width: 8,
          height: 8,
          background: "#7c3aed",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 9999,
          transition: "transform 0.1s",
          transform: hovering ? "scale(2)" : "scale(1)",
          mixBlendMode: "difference",
        }}
      />
      <div
        style={{
          position: "fixed",
          left: x - 20,
          top: y - 20,
          width: 40,
          height: 40,
          border: "1px solid rgba(124,58,237,0.5)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 9999,
          transition: "left 0.12s, top 0.12s, transform 0.2s, opacity 0.2s",
          transform: hovering ? "scale(1.5)" : "scale(1)",
          opacity: hovering ? 0.8 : 0.4,
        }}
      />
    </>
  );
}

/* ─── Noise texture overlay ─────────────────────────────────────────────────── */
function NoiseOverlay() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        opacity: 0.04,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "256px",
      }}
    />
  );
}

/* ─── Nav ─────────────────────────────────────────────────────────────────── */
function Nav({ active, onNav }) {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    const handle = () => {
      setVisible(window.scrollY < lastY.current || window.scrollY < 100);
      lastY.current = window.scrollY;
    };
    window.addEventListener("scroll", handle);
    return () => window.removeEventListener("scroll", handle);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "24px 48px",
        transform: visible ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1)",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)",
        backdropFilter: "blur(0px)",
      }}
    >
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: "0.05em",
          color: "#fff",
          cursor: "pointer",
        }}
        onClick={() => onNav("home")}
      >
        <span style={{ color: "#7c3aed" }}>◆</span> RYUK.DEV
      </div>
      <div style={{ display: "flex", gap: 40 }}>
        {SECTIONS.slice(1).map((s) => (
          <button
            key={s}
            onClick={() => onNav(s)}
            style={{
              background: "none",
              border: "none",
              color: active === s ? "#a78bfa" : "rgba(255,255,255,0.55)",
              fontSize: 13,
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 500,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "color 0.2s",
              padding: "4px 0",
              borderBottom: active === s ? "1px solid #7c3aed" : "1px solid transparent",
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </nav>
  );
}

/* ─── Hero Section ─────────────────────────────────────────────────────────── */
function HeroSection({ scrollY }) {
  const opacity = clamp(1 - scrollY / 600, 0, 1);
  const translateY = scrollY * 0.4;

  return (
    <section
      id="home"
      style={{
        position: "relative",
        zIndex: 10,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "0 80px",
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <span
          style={{
            display: "inline-block",
            background: "rgba(124,58,237,0.2)",
            border: "1px solid rgba(124,58,237,0.4)",
            color: "#a78bfa",
            fontSize: 11,
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            padding: "6px 16px",
            borderRadius: 100,
          }}
        >
          Available for work · 2025
        </span>
      </div>

      <h1
        style={{
          fontFamily: "'Syne', 'Space Grotesk', sans-serif",
          fontSize: "clamp(56px, 8vw, 110px)",
          fontWeight: 800,
          lineHeight: 0.9,
          margin: "0 0 8px",
          letterSpacing: "-0.04em",
          color: "#fff",
        }}
      >
        <span style={{ display: "block" }}>CREATIVE</span>
        <span
          style={{
            display: "block",
            WebkitTextFillColor: "transparent",
            WebkitTextStroke: "1px rgba(255,255,255,0.3)",
          }}
        >
          ENGINEER
        </span>
        <span
          style={{
            display: "block",
            background: "linear-gradient(135deg, #7c3aed, #06b6d4, #10b981)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          & MAKER
        </span>
      </h1>

      <p
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 16,
          color: "rgba(255,255,255,0.5)",
          maxWidth: 420,
          lineHeight: 1.7,
          margin: "24px 0 40px",
        }}
      >
        I build things at the intersection of performance engineering,
        generative systems, and spatial computing. Currently crafting the future
        at undisclosed location.
      </p>

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <button
          style={{
            background: "linear-gradient(135deg, #7c3aed, #4338ca)",
            border: "none",
            color: "#fff",
            fontSize: 13,
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "14px 32px",
            borderRadius: 4,
            cursor: "pointer",
            boxShadow: "0 0 30px rgba(124,58,237,0.4)",
          }}
        >
          View Work
        </button>
        <button
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.7)",
            fontSize: 13,
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "14px 32px",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Contact
        </button>
      </div>

      {/* scroll indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          left: 80,
          display: "flex",
          alignItems: "center",
          gap: 12,
          opacity: clamp(1 - scrollY / 200, 0, 1),
        }}
      >
        <div
          style={{
            width: 1,
            height: 40,
            background: "linear-gradient(to bottom, transparent, rgba(124,58,237,0.8))",
          }}
        />
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 10,
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            writingMode: "vertical-lr",
          }}
        >
          Scroll
        </span>
      </div>

      {/* stats */}
      <div
        style={{
          position: "absolute",
          right: 80,
          bottom: 80,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          textAlign: "right",
        }}
      >
        {[
          ["08+", "Years building"],
          ["40+", "Projects shipped"],
          ["12", "Open source"],
        ].map(([n, l]) => (
          <div key={n}>
            <div
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 32,
                fontWeight: 800,
                color: "#fff",
                lineHeight: 1,
              }}
            >
              {n}
            </div>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              {l}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── About Section ─────────────────────────────────────────────────────────── */
function AboutSection({ visible }) {
  const skills = [
    { name: "Systems Architecture", pct: 95 },
    { name: "3D / WebGL", pct: 92 },
    { name: "Machine Learning", pct: 85 },
    { name: "Distributed Systems", pct: 88 },
    { name: "Cryptography / ZK", pct: 78 },
  ];

  return (
    <section
      id="about"
      style={{
        position: "relative",
        zIndex: 10,
        minHeight: "100vh",
        padding: "120px 80px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 80,
        alignItems: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(60px)",
        transition: "opacity 0.8s ease, transform 0.8s ease",
      }}
    >
      {/* left */}
      <div>
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11,
            color: "#7c3aed",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            marginBottom: 20,
          }}
        >
          ── About
        </div>
        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(36px, 5vw, 64px)",
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            margin: "0 0 28px",
          }}
        >
          I turn complex
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ideas
          </span>{" "}
          into fast,
          <br />
          beautiful systems.
        </h2>

        <p
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 15,
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.8,
            marginBottom: 24,
            maxWidth: 480,
          }}
        >
          Self-taught engineer with a decade of building at the bleeding edge.
          I've shipped real-time systems serving millions, created generative
          art installations, and co-authored a cryptography library with 12k
          GitHub stars.
        </p>
        <p
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 15,
            color: "rgba(255,255,255,0.4)",
            lineHeight: 1.8,
            maxWidth: 480,
          }}
        >
          When not coding, I'm reading obscure compilers papers, racing
          motorcycles, or trying to brew the perfect pour-over.
        </p>
      </div>

      {/* right: skills */}
      <div>
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11,
            color: "#7c3aed",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            marginBottom: 32,
          }}
        >
          ── Expertise
        </div>
        {skills.map((sk, i) => (
          <div key={sk.name} style={{ marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 13,
                  color: "#fff",
                  fontWeight: 500,
                }}
              >
                {sk.name}
              </span>
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                {sk.pct}%
              </span>
            </div>
            <div
              style={{
                height: 2,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: visible ? `${sk.pct}%` : "0%",
                  background: `linear-gradient(90deg, #7c3aed, #06b6d4)`,
                  borderRadius: 2,
                  transition: `width 1.2s cubic-bezier(0.16,1,0.3,1) ${i * 0.1}s`,
                  boxShadow: "0 0 8px rgba(124,58,237,0.6)",
                }}
              />
            </div>
          </div>
        ))}

        {/* tech stack pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 40 }}>
          {[
            "Rust", "C++", "TypeScript", "Python", "Go", "WASM",
            "WebGPU", "Three.js", "CUDA", "Solidity",
          ].map((t) => (
            <span
              key={t}
              style={{
                fontFamily: "'Space Grotesk', monospace",
                fontSize: 11,
                color: "rgba(255,255,255,0.5)",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "4px 10px",
                borderRadius: 2,
                letterSpacing: "0.05em",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Project Card ─────────────────────────────────────────────────────────── */
function ProjectCard({ project, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isActive
          ? "rgba(255,255,255,0.06)"
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${isActive ? project.color + "60" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 16,
        padding: "36px",
        cursor: "pointer",
        transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
        transform: isActive ? "translateY(-4px)" : hovered ? "translateY(-2px)" : "none",
        boxShadow: isActive ? `0 20px 60px ${project.color}20` : "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* glow accent top bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${project.color}, transparent)`,
          opacity: isActive ? 1 : 0,
          transition: "opacity 0.4s",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 10,
            color: project.color,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            border: `1px solid ${project.color}40`,
            padding: "3px 10px",
            borderRadius: 100,
          }}
        >
          {project.tag}
        </span>
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 10,
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.1em",
          }}
        >
          {project.year}
        </span>
      </div>

      <h3
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 28,
          fontWeight: 800,
          color: "#fff",
          margin: "0 0 12px",
          letterSpacing: "-0.02em",
        }}
      >
        {project.title}
      </h3>

      <p
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 13,
          color: "rgba(255,255,255,0.45)",
          lineHeight: 1.7,
          margin: "0 0 24px",
        }}
      >
        {project.desc}
      </p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {project.tech.map((t) => (
          <span
            key={t}
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              color: isActive ? project.color : "rgba(255,255,255,0.3)",
              transition: "color 0.3s",
              letterSpacing: "0.05em",
            }}
          >
            {t}
            {project.tech[project.tech.length - 1] !== t ? " ·" : ""}
          </span>
        ))}
      </div>

      <div
        style={{
          marginTop: 28,
          display: "flex",
          alignItems: "center",
          gap: 8,
          opacity: isActive ? 1 : 0,
          transform: isActive ? "translateX(0)" : "translateX(-8px)",
          transition: "all 0.3s",
        }}
      >
        <div
          style={{
            width: 24,
            height: 1,
            background: project.color,
          }}
        />
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11,
            color: project.color,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Case Study
        </span>
        <span style={{ color: project.color, fontSize: 12 }}>→</span>
      </div>
    </div>
  );
}

/* ─── Work Section ──────────────────────────────────────────────────────────── */
function WorkSection({ visible }) {
  const [active, setActive] = useState(0);

  return (
    <section
      id="work"
      style={{
        position: "relative",
        zIndex: 10,
        minHeight: "100vh",
        padding: "120px 80px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(60px)",
        transition: "opacity 0.8s ease, transform 0.8s ease",
      }}
    >
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 11,
          color: "#7c3aed",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          marginBottom: 20,
        }}
      >
        ── Selected Work
      </div>
      <h2
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "clamp(32px, 4vw, 56px)",
          fontWeight: 800,
          color: "#fff",
          letterSpacing: "-0.03em",
          margin: "0 0 60px",
        }}
      >
        Things I've built
        <br />
        that{" "}
        <span
          style={{
            background: "linear-gradient(135deg, #7c3aed, #10b981)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          actually matter.
        </span>
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 20,
        }}
      >
        {PROJECTS.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            isActive={active === p.id}
            onClick={() => setActive(p.id)}
          />
        ))}
      </div>

      {/* large project number accent */}
      <div
        style={{
          position: "absolute",
          top: 120,
          right: 80,
          fontFamily: "'Syne', sans-serif",
          fontSize: 180,
          fontWeight: 800,
          color: "rgba(255,255,255,0.015)",
          lineHeight: 1,
          userSelect: "none",
          letterSpacing: "-0.05em",
        }}
      >
        {String(active + 1).padStart(2, "0")}
      </div>
    </section>
  );
}

/* ─── Contact Section ─────────────────────────────────────────────────────── */
function ContactSection({ visible }) {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const inputStyle = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "14px 18px",
    color: "#fff",
    fontSize: 14,
    fontFamily: "'Space Grotesk', sans-serif",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  return (
    <section
      id="contact"
      style={{
        position: "relative",
        zIndex: 10,
        minHeight: "100vh",
        padding: "120px 80px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 80,
        alignItems: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(60px)",
        transition: "opacity 0.8s ease, transform 0.8s ease",
      }}
    >
      {/* left */}
      <div>
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11,
            color: "#7c3aed",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            marginBottom: 20,
          }}
        >
          ── Get in touch
        </div>
        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(36px, 5vw, 64px)",
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            margin: "0 0 24px",
          }}
        >
          Let's build
          <br />
          something{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            wild.
          </span>
        </h2>
        <p
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 15,
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.8,
            maxWidth: 380,
            marginBottom: 48,
          }}
        >
          I take on a handful of projects each year. If you have something
          ambitious, technical, or just genuinely interesting — reach out.
        </p>

        {/* social links */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            ["GitHub", "github.com/ryuk"],
            ["Twitter / X", "@ryuk_dev"],
            ["LinkedIn", "linkedin.com/in/ryuk"],
            ["Email", "hello@ryuk.dev"],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.25)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  minWidth: 80,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                {val}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* right: form */}
      <div>
        {sent ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 40px",
              border: "1px solid rgba(124,58,237,0.3)",
              borderRadius: 16,
              background: "rgba(124,58,237,0.05)",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>✦</div>
            <h3
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 28,
                fontWeight: 800,
                color: "#fff",
                marginBottom: 12,
              }}
            >
              Message sent.
            </h3>
            <p
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                color: "rgba(255,255,255,0.4)",
                fontSize: 14,
              }}
            >
              I'll be in touch within 48 hours.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <input
                style={inputStyle}
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                style={inputStyle}
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <textarea
              style={{ ...inputStyle, height: 160, resize: "none" }}
              placeholder="Tell me about your project..."
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
            />
            <button
              onClick={() => setSent(true)}
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4338ca)",
                border: "none",
                color: "#fff",
                fontSize: 13,
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                padding: "16px",
                borderRadius: 8,
                cursor: "pointer",
                boxShadow: "0 0 40px rgba(124,58,237,0.3)",
                transition: "box-shadow 0.3s",
              }}
            >
              Send Message →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer
      style={{
        position: "relative",
        zIndex: 10,
        padding: "40px 80px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 12,
          color: "rgba(255,255,255,0.2)",
          letterSpacing: "0.1em",
        }}
      >
        © 2025 RYUK.DEV — Crafted with obsessive attention to detail
      </span>
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 12,
          color: "rgba(255,255,255,0.2)",
          letterSpacing: "0.1em",
        }}
      >
        All systems operational ◆
      </span>
    </footer>
  );
}

/* ─── Main App ──────────────────────────────────────────────────────────────── */
export default function Portfolio() {
  const [scrollY, setScrollY] = useState(0);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [mouseNorm, setMouseNorm] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [sectionsVisible, setSectionsVisible] = useState({
    about: false,
    work: false,
    contact: false,
  });

  /* load fonts */
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.background = "#050507";
    document.body.style.cursor = "none";
    return () => {
      document.body.style.cursor = "";
    };
  }, []);

  /* scroll */
  useEffect(() => {
    const onScroll = () => {
      const sy = window.scrollY;
      setScrollY(sy);

      const wh = window.innerHeight;
      setSectionsVisible({
        about: sy > wh * 0.5,
        work: sy > wh * 1.2,
        contact: sy > wh * 2.2,
      });

      // active section
      const sections = ["contact", "work", "about", "home"];
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top < wh * 0.5) {
            setActiveSection(id);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* mouse */
  useEffect(() => {
    const onMove = (e) => {
      setMouse({ x: e.clientX, y: e.clientY });
      setMouseNorm({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: -(e.clientY / window.innerHeight - 0.5) * 2,
      });
      const el = document.elementFromPoint(e.clientX, e.clientY);
      setHovering(
        el?.tagName === "BUTTON" ||
          el?.tagName === "A" ||
          el?.style?.cursor === "pointer" ||
          el?.closest("[style*='cursor: pointer']") !== null
      );
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const onNav = (section) => {
    const el = document.getElementById(section);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      style={{
        position: "relative",
        background: "#050507",
        color: "#fff",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #050507; }
        ::-webkit-scrollbar-thumb { background: #7c3aed55; border-radius: 2px; }
        html { scroll-behavior: smooth; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        input:focus, textarea:focus {
          border-color: rgba(124,58,237,0.5) !important;
          box-shadow: 0 0 0 2px rgba(124,58,237,0.15);
        }
      `}</style>

      {/* 3D Background */}
      <ThreeCanvas
        scrollY={scrollY}
        activeSection={activeSection}
        mouseX={mouseNorm.x}
        mouseY={mouseNorm.y}
      />

      {/* Film grain */}
      <NoiseOverlay />

      {/* Custom cursor */}
      <Cursor x={mouse.x} y={mouse.y} hovering={hovering} />

      {/* Vignette */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* Side progress bar */}
      <div
        style={{
          position: "fixed",
          right: 24,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          alignItems: "center",
        }}
      >
        {SECTIONS.map((s) => (
          <div
            key={s}
            onClick={() => onNav(s)}
            style={{
              width: activeSection === s ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background:
                activeSection === s
                  ? "linear-gradient(90deg, #7c3aed, #06b6d4)"
                  : "rgba(255,255,255,0.15)",
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        ))}
      </div>

      {/* Nav */}
      <Nav active={activeSection} onNav={onNav} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 10 }}>
        <HeroSection scrollY={scrollY} />
        <AboutSection visible={sectionsVisible.about} />
        <WorkSection visible={sectionsVisible.work} />
        <ContactSection visible={sectionsVisible.contact} />
        <Footer />
      </div>
    </div>
  );
}
