/* ============================================================
   SISHIR GIRI — PORTFOLIO SCRIPT
   Three.js 3D effects + all animations and interactions
   ============================================================ */

'use strict';

/* ══════════════════════════════════════
   UTILITY HELPERS
══════════════════════════════════════ */

/** Linear interpolation */
const lerp = (a, b, t) => a + (b - a) * t;

/** Check if device prefers reduced motion */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Mobile detection for lighter Three.js config */
const isMobile = window.innerWidth < 768;

/* ══════════════════════════════════════
   1. HERO THREE.JS — PARTICLE NEBULA + DNA HELIX
══════════════════════════════════════ */
(function initHeroScene() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas || typeof THREE === 'undefined') return;

  /* ── Renderer ── */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0); // transparent

  /* ── Scene & Camera ── */
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 28);

  /* ── Mouse tracking ── */
  const mouse  = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  document.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  /* ────────────────────────────────────
     STAR FIELD — tiny distant particles
  ──────────────────────────────────── */
  const starCount = isMobile ? 600 : 1400;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i++) {
    starPositions[i] = (Math.random() - 0.5) * 200;
  }
  const starGeo  = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat  = new THREE.PointsMaterial({ color: 0xaaccff, size: 0.12, transparent: true, opacity: 0.6 });
  scene.add(new THREE.Points(starGeo, starMat));

  /* ────────────────────────────────────
     NEBULA PARTICLES — colored clouds
  ──────────────────────────────────── */
  const nebulaCount = isMobile ? 300 : 700;
  const nebPos   = new Float32Array(nebulaCount * 3);
  const nebColor = new Float32Array(nebulaCount * 3);
  for (let i = 0; i < nebulaCount; i++) {
    const r   = 10 + Math.random() * 14;
    const phi = Math.acos(-1 + Math.random() * 2);
    const tht = Math.random() * Math.PI * 2;
    nebPos[i*3]   = r * Math.sin(phi) * Math.cos(tht);
    nebPos[i*3+1] = r * Math.sin(phi) * Math.sin(tht);
    nebPos[i*3+2] = r * Math.cos(phi) - 10;
    // Cyan / violet gradient by Y position
    const t = (nebPos[i*3+1] + r) / (2 * r);
    nebColor[i*3]   = lerp(0.49, 0.0,  t); // R
    nebColor[i*3+1] = lerp(0.23, 0.83, t); // G
    nebColor[i*3+2] = lerp(0.93, 1.0,  t); // B
  }
  const nebGeo = new THREE.BufferGeometry();
  nebGeo.setAttribute('position', new THREE.BufferAttribute(nebPos, 3));
  nebGeo.setAttribute('color',    new THREE.BufferAttribute(nebColor, 3));
  const nebMat = new THREE.PointsMaterial({
    size: isMobile ? 0.22 : 0.18,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const nebula = new THREE.Points(nebGeo, nebMat);
  scene.add(nebula);

  /* ────────────────────────────────────
     DNA HELIX — the hero 3D object
  ──────────────────────────────────── */
  const helixGroup = new THREE.Group();
  scene.add(helixGroup);

  const helixHeight  = 14;
  const helixRadius  = 2.6;
  const helixTurns   = 4;
  const strandPoints = 120;

  // Two strand colors
  const colorA = new THREE.Color(0x00d4ff); // cyan
  const colorB = new THREE.Color(0x7c3aed); // violet

  function buildStrand(phaseOffset, color) {
    const pts = [];
    for (let i = 0; i <= strandPoints; i++) {
      const t     = i / strandPoints;
      const angle = t * Math.PI * 2 * helixTurns + phaseOffset;
      pts.push(new THREE.Vector3(
        Math.cos(angle) * helixRadius,
        t * helixHeight - helixHeight / 2,
        Math.sin(angle) * helixRadius
      ));
    }
    const curve  = new THREE.CatmullRomCurve3(pts);
    const geo    = new THREE.TubeGeometry(curve, strandPoints * 2, 0.06, 6, false);
    const mat    = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
    return new THREE.Mesh(geo, mat);
  }

  helixGroup.add(buildStrand(0,          colorA));
  helixGroup.add(buildStrand(Math.PI,    colorB));

  // Rungs (horizontal bridges)
  const rungCount = helixTurns * 8;
  for (let i = 0; i <= rungCount; i++) {
    const t     = i / rungCount;
    const angle = t * Math.PI * 2 * helixTurns;
    const y     = t * helixHeight - helixHeight / 2;
    const pA    = new THREE.Vector3(Math.cos(angle) * helixRadius, y, Math.sin(angle) * helixRadius);
    const pB    = new THREE.Vector3(Math.cos(angle + Math.PI) * helixRadius, y, Math.sin(angle + Math.PI) * helixRadius);

    // Blend color cyan → violet along Y
    const mixedColor = colorA.clone().lerp(colorB, t);

    const rungGeo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
    const rungMat = new THREE.LineBasicMaterial({ color: mixedColor, transparent: true, opacity: 0.4 });
    helixGroup.add(new THREE.Line(rungGeo, rungMat));

    // Sphere nodes at each rung end
    [pA, pB].forEach((pt, idx) => {
      const sg  = new THREE.SphereGeometry(0.1, 6, 6);
      const sm  = new THREE.MeshBasicMaterial({ color: idx === 0 ? colorA : colorB });
      const sph = new THREE.Mesh(sg, sm);
      sph.position.copy(pt);
      helixGroup.add(sph);
    });
  }

  // Position helix to the right
  helixGroup.position.set(7, 0, 0);
  helixGroup.rotation.x = 0.15;

  /* ────────────────────────────────────
     FLOATING GEOMETRIC SHAPES
  ──────────────────────────────────── */
  const shapes = [];
  const shapeData = [
    { geo: new THREE.OctahedronGeometry(0.5),    pos: [-12, 5, -5],  rot: [0.6, 0.4, 0.2],  col: 0x00d4ff },
    { geo: new THREE.TetrahedronGeometry(0.4),   pos: [-9,  -4, -8], rot: [0.3, 0.8, 0.1],  col: 0x7c3aed },
    { geo: new THREE.IcosahedronGeometry(0.35),  pos: [12, -5, -10], rot: [0.5, 0.3, 0.7],  col: 0xf472b6 },
    { geo: new THREE.DodecahedronGeometry(0.3),  pos: [-14, -2, -6], rot: [0.2, 0.6, 0.4],  col: 0x00d4ff },
    { geo: new THREE.OctahedronGeometry(0.25),   pos: [11, 6,  -4],  rot: [0.7, 0.1, 0.5],  col: 0x7c3aed },
  ];

  shapeData.forEach(({ geo, pos, rot, col }) => {
    const mat   = new THREE.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.35 });
    const mesh  = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.userData.rotSpeed = rot;
    mesh.userData.floatOffset = Math.random() * Math.PI * 2;
    scene.add(mesh);
    shapes.push(mesh);
  });

  /* ── Resize handler ── */
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize, { passive: true });

  /* ── Animation loop ── */
  let frameId;
  const clock = new THREE.Clock();
  let isVisible = true;

  // Pause when hero is not visible
  const heroObserver = new IntersectionObserver(
    ([entry]) => { isVisible = entry.isIntersecting; },
    { threshold: 0 }
  );
  heroObserver.observe(document.getElementById('hero'));

  function animate() {
    frameId = requestAnimationFrame(animate);
    if (!isVisible) return;

    const elapsed = clock.getElapsedTime();

    // Smooth camera follow mouse
    target.x = lerp(target.x, mouse.x * 1.5, 0.04);
    target.y = lerp(target.y, mouse.y * 0.8, 0.04);
    camera.position.x = lerp(camera.position.x, target.x, 0.06);
    camera.position.y = lerp(camera.position.y, target.y * 0.5, 0.06);
    camera.lookAt(0, 0, 0);

    // Rotate nebula slowly
    nebula.rotation.y = elapsed * 0.04;
    nebula.rotation.x = elapsed * 0.018;

    // Rotate helix
    helixGroup.rotation.y = elapsed * 0.3;
    helixGroup.position.y = Math.sin(elapsed * 0.5) * 0.6;

    // Animate floating shapes
    shapes.forEach((shape) => {
      shape.rotation.x += shape.userData.rotSpeed[0] * 0.008;
      shape.rotation.y += shape.userData.rotSpeed[1] * 0.01;
      shape.rotation.z += shape.userData.rotSpeed[2] * 0.007;
      shape.position.y += Math.sin(elapsed + shape.userData.floatOffset) * 0.003;
    });

    renderer.render(scene, camera);
  }

  animate();
})();

/* ══════════════════════════════════════
   2. PROJECTS BACKGROUND — subtle mesh lines
══════════════════════════════════════ */
(function initProjectsBg() {
  const canvas = document.getElementById('projectsBg');
  if (!canvas || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(1);
  const section  = document.getElementById('projects');
  renderer.setSize(section.offsetWidth, section.offsetHeight);
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, section.offsetWidth / section.offsetHeight, 0.1, 100);
  camera.position.z = 16;

  // Grid of dots
  const dotCount = isMobile ? 200 : 500;
  const positions = new Float32Array(dotCount * 3);
  for (let i = 0; i < dotCount; i++) {
    positions[i*3]   = (Math.random() - 0.5) * 40;
    positions[i*3+1] = (Math.random() - 0.5) * 30;
    positions[i*3+2] = (Math.random() - 0.5) * 10;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x00d4ff,
    size: 0.08,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const dots = new THREE.Points(geo, mat);
  scene.add(dots);

  // Observer to pause when offscreen
  let visible = false;
  const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
  obs.observe(section);

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;
    dots.rotation.y = clock.getElapsedTime() * 0.06;
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    renderer.setSize(section.offsetWidth, section.offsetHeight);
    camera.aspect = section.offsetWidth / section.offsetHeight;
    camera.updateProjectionMatrix();
  }, { passive: true });
})();

/* ══════════════════════════════════════
   3. TYPEWRITER EFFECT
══════════════════════════════════════ */
(function initTypewriter() {
  const el = document.getElementById('typeTarget');
  if (!el) return;

  const phrases = [
    'Aspiring Developer | AI Enthusiast',
    'Building Tomorrow\'s Solutions Today',
    'Python • JavaScript • C • AI/ML',
    'From Kathmandu to the World 🌏',
  ];

  let pIdx = 0, cIdx = 0, deleting = false;

  function tick() {
    const phrase = phrases[pIdx];

    if (!deleting) {
      el.textContent = phrase.slice(0, cIdx + 1);
      cIdx++;
      if (cIdx === phrase.length) {
        deleting = true;
        setTimeout(tick, 1800);
        return;
      }
    } else {
      el.textContent = phrase.slice(0, cIdx - 1);
      cIdx--;
      if (cIdx === 0) {
        deleting = false;
        pIdx = (pIdx + 1) % phrases.length;
        setTimeout(tick, 400);
        return;
      }
    }

    setTimeout(tick, deleting ? 45 : 80);
  }

  setTimeout(tick, 1000);
})();

/* ══════════════════════════════════════
   4. NAVBAR — scroll shrink + active link
══════════════════════════════════════ */
(function initNavbar() {
  const navbar    = document.getElementById('navbar');
  const navLinks  = document.querySelectorAll('.nav-link');
  const hamburger = document.getElementById('hamburger');
  const navMenu   = document.getElementById('navLinks');

  // Scroll handler
  function onScroll() {
    // Scrolled class for background
    navbar.classList.toggle('scrolled', window.scrollY > 50);

    // Active section highlight
    const sections = ['about', 'projects', 'skills', 'contact'];
    let activeId = '';

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.top <= 120 && rect.bottom >= 120) activeId = id;
    });

    navLinks.forEach((link) => {
      link.classList.toggle('active', link.dataset.section === activeId);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Hamburger toggle
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navMenu.classList.toggle('open');
  });

  // Close menu on link click
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navMenu.classList.remove('open');
    });
  });
})();

/* ══════════════════════════════════════
   5. SMOOTH SCROLL (polyfill for older browsers)
══════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ══════════════════════════════════════
   6. INTERSECTION OBSERVER — scroll reveals
══════════════════════════════════════ */
(function initReveal() {
  const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-up');
  if (!els.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Unobserve after reveal for performance
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  els.forEach((el) => observer.observe(el));
})();

/* ══════════════════════════════════════
   7. SKILL BARS — animate on scroll
══════════════════════════════════════ */
(function initSkillBars() {
  const fills = document.querySelectorAll('.skill-fill');
  if (!fills.length) return;

  let animated = false;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        fills.forEach((fill) => {
          const w = fill.dataset.w || 0;
          // Slight delay per bar for stagger
          const idx = Array.from(fills).indexOf(fill);
          setTimeout(() => {
            fill.style.width = w + '%';
          }, idx * 120);
        });
        observer.disconnect();
      }
    },
    { threshold: 0.4 }
  );

  const skillsSection = document.getElementById('skills');
  if (skillsSection) observer.observe(skillsSection);
})();

/* ══════════════════════════════════════
   8. CUSTOM CURSOR
══════════════════════════════════════ */
(function initCursor() {
  const cursor   = document.getElementById('cursor');
  const follower = document.getElementById('cursorFollower');
  if (!cursor || !follower || window.matchMedia('(pointer: coarse)').matches) return;

  let mx = -100, my = -100;
  let fx = -100, fy = -100;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    cursor.style.transform = `translate(${mx - 6}px, ${my - 6}px)`;
  });

  // Follower uses lerp in RAF
  function followCursor() {
    fx = lerp(fx, mx, 0.14);
    fy = lerp(fy, my, 0.14);
    follower.style.transform = `translate(${fx - 18}px, ${fy - 18}px)`;
    requestAnimationFrame(followCursor);
  }
  followCursor();

  // Scale up on interactive elements
  const interactiveEls = document.querySelectorAll('a, button, .project-card, .hex-badge, input, textarea');
  interactiveEls.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      cursor.style.transform   += ' scale(1.8)';
      follower.style.transform += ' scale(1.6)';
      follower.style.borderColor = 'rgba(0,212,255,0.7)';
    });
    el.addEventListener('mouseleave', () => {
      follower.style.borderColor = '';
    });
  });
})();

/* ══════════════════════════════════════
   9. CONTACT FORM — validation + fake submit
══════════════════════════════════════ */
(function initContactForm() {
  const form     = document.getElementById('contactForm');
  const feedback = document.getElementById('formFeedback');
  if (!form || !feedback) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name    = form.querySelector('#name').value.trim();
    const email   = form.querySelector('#email').value.trim();
    const message = form.querySelector('#message').value.trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Clear previous feedback
    feedback.className = 'form-feedback';
    feedback.textContent = '';

    // Validation
    if (!name) {
      showFeedback('error', '⚠ Please enter your name.');
      form.querySelector('#name').focus();
      return;
    }
    if (!emailRe.test(email)) {
      showFeedback('error', '⚠ Please enter a valid email address.');
      form.querySelector('#email').focus();
      return;
    }
    if (!message) {
      showFeedback('error', '⚠ Please write a message.');
      form.querySelector('#message').focus();
      return;
    }

    // Fake async send
    const btn = form.querySelector('button[type="submit"]');
    const origText = btn.querySelector('.btn-text').textContent;
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'Sending…';

    setTimeout(() => {
      showFeedback('success', `✓ Thanks, ${name}! Your message has been sent. I'll reply within 24 hours.`);
      form.reset();
      btn.disabled = false;
      btn.querySelector('.btn-text').textContent = origText;
    }, 1400);
  });

  function showFeedback(type, msg) {
    feedback.textContent = msg;
    feedback.className   = `form-feedback ${type}`;
    feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
})();

// hello

emailjs.init("YOUR_PUBLIC_KEY");

document.querySelector("form").addEventListener("submit", function(e) {
  e.preventDefault();

  emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
    name: document.querySelector("#name").value,
    email: document.querySelector("#email").value,
    subject: document.querySelector("#subject").value,
    message: document.querySelector("#message").value,
  })
  .then(() => {
    alert("Message sent to Gmail!");
  })
  .catch((error) => {
    alert("Failed to send message");
    console.log(error);
  });
});

/* ══════════════════════════════════════
   10. PROJECT CARD — tilt on hover
══════════════════════════════════════ */
(function initCardTilt() {
  if (isMobile) return; // Skip on mobile

  document.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect  = card.getBoundingClientRect();
      const cx    = rect.left + rect.width  / 2;
      const cy    = rect.top  + rect.height / 2;
      const dx    = (e.clientX - cx) / (rect.width  / 2);
      const dy    = (e.clientY - cy) / (rect.height / 2);
      const tiltX = -dy * 6; // degrees
      const tiltY =  dx * 6;
      card.style.transform = `translateY(-8px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.5s ease';
      setTimeout(() => { card.style.transition = ''; }, 500);
    });
  });
})();

/* ══════════════════════════════════════
   11. HERO STATS — count-up animation
══════════════════════════════════════ */
(function initCountUp() {
  const statEls = document.querySelectorAll('.stat-value');
  let ran = false;

  function countUp(el, endVal, suffix, duration) {
    if (isNaN(endVal)) { el.textContent = endVal + suffix; return; }
    let start = 0;
    const step  = duration / endVal;
    const timer = setInterval(() => {
      start += 1;
      el.textContent = start + suffix;
      if (start >= endVal) { el.textContent = endVal + suffix; clearInterval(timer); }
    }, step);
  }

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !ran) {
      ran = true;
      statEls.forEach((el) => {
        const raw = el.textContent.trim();
        if (raw === '∞') return;
        const num    = parseInt(raw, 10);
        const suffix = raw.replace(String(num), '');
        el.textContent = '0';
        countUp(el, num, suffix, 1000);
      });
      observer.disconnect();
    }
  }, { threshold: 0.8 });

  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) observer.observe(heroStats);
})();

/* ══════════════════════════════════════
   12. SECTION NUMBER PARALLAX
══════════════════════════════════════ */
(function initParallax() {
  if (isMobile || prefersReducedMotion) return;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    document.querySelectorAll('.section-number').forEach((el) => {
      el.style.transform = `translateY(${y * 0.02}px)`;
    });
  }, { passive: true });
})();

/* ══════════════════════════════════════
   INIT COMPLETE LOG
══════════════════════════════════════ */
console.log(
  '%c[SG] Portfolio loaded 🚀 Three.js + Vanilla JS',
  'color:#00d4ff; font-family:monospace; font-size:13px; font-weight:bold;'
);