import './style.css';
import * as THREE from 'three';
import vertexShader from "./shaders/vertexShader.glsl";
import fragmentShader from "./shaders/fragmentShader.glsl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, ScrambleTextPlugin, ScrollToPlugin);

/* =========================================================
   WEBGL
   ========================================================= */

const canvas = document.getElementById("canvas");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({
	canvas,
	antialias: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const geometry = new THREE.IcosahedronGeometry(2, 20);
const material = new THREE.ShaderMaterial({
	vertexShader,
	fragmentShader,
	uniforms: {
		uTime: {
			value: 0
		},
		uColorChange: {
			value: 0
		}
	},
});
const sphere = new THREE.Mesh(geometry, material);
sphere.position.y = -2.5;
scene.add(sphere);

function resize() {
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;
	if (width === 0 || height === 0) return;

	// false -> keep the CSS size, only resize the drawing buffer
	renderer.setSize(width, height, false);
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
}

// fires on first observe and whenever the CSS size changes
new ResizeObserver(resize).observe(canvas);

/* -------- pointer parallax on the blob -------- */
const pointer = { x: 0, y: 0 };
const eased = { x: 0, y: 0 };

window.addEventListener("pointermove", (e) => {
	pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
	pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

/* -------- hero scroll timeline -------- */
var tl = gsap.timeline({
	scrollTrigger: {
		trigger: ".landing",
		start: "top top",
		end: "bottom center",
		scrub: 2,
	},
},
);
tl.to(sphere.position, {
	y: 0,
	z: -2.5,
	ease: "power2.inOut",
}, "a")
.to(sphere.scale, {
	x: 1.25,
	y: 1.25,
	z: 1.25,
	ease: "power2.inOut",
}, "a")
.to(sphere.rotation, {
	z: Math.PI * 0.4,
	ease: "none",
}, "a")
.to(material.uniforms.uColorChange, {
	value: 1,
	ease: "power2.inOut",
}, "a")
.to(".landing h1", {
	opacity: 0,
}, "a")
.to(".landing p", {
	opacity: 1,
},);

const timer = new THREE.Timer();
function animate() {
	requestAnimationFrame(animate);

	timer.update();
	const t = timer.getElapsed();
	material.uniforms.uTime.value = t;

	// ease the pointer so the blob lags behind the cursor
	eased.x += (pointer.x - eased.x) * 0.045;
	eased.y += (pointer.y - eased.y) * 0.045;

	sphere.position.x = eased.x * 0.4;
	sphere.rotation.y = t * 0.06 + eased.x * 0.35;
	sphere.rotation.x = eased.y * 0.25;

	renderer.render(scene, camera);
}

animate();

/* =========================================================
   PAGE ANIMATIONS
   Everything below is gated behind prefers-reduced-motion,
   so the page renders fully static for anyone who opts out.
   ========================================================= */

const mm = gsap.matchMedia();

mm.add("(prefers-reduced-motion: no-preference)", () => {

	/* -------- scroll progress bar -------- */
	gsap.to(".scroll-progress", {
		scaleX: 1,
		ease: "none",
		scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
	});

	/* -------- nav: condense on scroll, hide going down -------- */
	const nav = document.querySelector("nav");

	let navDirection = 0;

	ScrollTrigger.create({
		start: "top -120",
		end: "max",
		onUpdate: (self) => {
			// only retween when the scroll direction actually flips
			if (self.direction === navDirection) return;
			navDirection = self.direction;

			gsap.to(nav, {
				yPercent: self.direction === 1 ? -130 : 0,
				duration: 0.45,
				ease: "power2.out",
				overwrite: "auto",
			});
		},
		onEnter: () => gsap.to(nav, {
			paddingTop: "1.1rem",
			paddingBottom: "1.1rem",
			backgroundColor: "rgba(255,255,255,0.72)",
			backdropFilter: "blur(14px)",
			borderBottomColor: "rgba(0,0,0,0.08)",
			duration: 0.5,
			ease: "power2.out",
		}),
		onLeaveBack: () => gsap.to(nav, {
			paddingTop: "2.5rem",
			paddingBottom: "2.5rem",
			backgroundColor: "rgba(255,255,255,0)",
			backdropFilter: "blur(0px)",
			borderBottomColor: "rgba(0,0,0,0)",
			duration: 0.5,
			ease: "power2.out",
		}),
	});

	/* -------- intro: nav + hero headline (played by the loader) -------- */
	const heroSplit = new SplitText(".landing h1", { type: "chars" });

	const buildIntro = () => gsap.timeline({ defaults: { ease: "power3.out" } })
		.from("nav h1", { yPercent: -160, opacity: 0, duration: 0.9 })
		.from("nav a", { yPercent: -160, opacity: 0, duration: 0.8, stagger: 0.07 }, "<0.08")
		.from(heroSplit.chars, {
			yPercent: 110,
			opacity: 0,
			rotateX: -75,
			transformOrigin: "50% 100%",
			duration: 1,
			stagger: 0.022,
		}, "<0.1");

	/* -------- generic scroll reveals -------- */
	const batchReveal = (selector, { y = 44, stagger = 0.09, start = "top 86%" } = {}) => {
		const items = gsap.utils.toArray(selector);
		if (!items.length) return;

		gsap.set(items, { y, opacity: 0 });

		ScrollTrigger.batch(items, {
			start,
			once: true,
			onEnter: (batch) => gsap.to(batch, {
				y: 0,
				opacity: 1,
				duration: 1,
				ease: "power3.out",
				stagger,
				overwrite: true,
			}),
		});
	};

	batchReveal("section span.uppercase", { y: 20, stagger: 0 });
	batchReveal("section article", { y: 60, stagger: 0.12 });
	batchReveal(".work-row", { y: 50, stagger: 0.1 });
	batchReveal(".process-grid > div", { y: 50, stagger: 0.1 });
	batchReveal(".stat-grid > div", { y: 40, stagger: 0.1 });
	batchReveal("footer nav, .footer-intro", { y: 40, stagger: 0.1 });

	/* -------- line-by-line headline reveals -------- */
	gsap.utils.toArray("#about h2, #about p, #contact h2, blockquote p").forEach((el) => {
		const split = new SplitText(el, { type: "lines" });

		gsap.from(split.lines, {
			yPercent: 100,
			opacity: 0,
			duration: 1.1,
			ease: "power4.out",
			stagger: 0.07,
			scrollTrigger: { trigger: el, start: "top 88%", once: true },
		});
	});

	/* -------- stats count up -------- */
	gsap.utils.toArray(".stat-num").forEach((el) => {
		const raw = el.textContent.trim();
		const target = parseFloat(raw);
		if (Number.isNaN(target)) return;

		const suffix = raw.replace(/^[\d.]+/, "");
		const decimals = (raw.match(/\.(\d+)/) || ["", ""])[1].length;
		const counter = { value: 0 };

		gsap.to(counter, {
			value: target,
			duration: 2,
			ease: "power2.out",
			scrollTrigger: { trigger: el, start: "top 88%", once: true },
			onUpdate: () => {
				el.textContent = counter.value.toFixed(decimals) + suffix;
			},
		});
	});

	/* -------- marquee driven by scroll velocity -------- */
	const marquee = document.querySelector(".marquee");

	if (marquee) {
		marquee.classList.add("marquee--js");

		const loop = gsap.to(".marquee__track", {
			xPercent: -100,
			repeat: -1,
			duration: 24,
			ease: "none",
		});

		let settle;

		ScrollTrigger.create({
			start: 0,
			end: "max",
			onUpdate: (self) => {
				const velocity = self.getVelocity();
				const boost = gsap.utils.clamp(1, 7, 1 + Math.abs(velocity) / 700);

				gsap.to(loop, {
					timeScale: boost * self.direction,
					duration: 0.35,
					overwrite: true,
				});
				gsap.to(".marquee__item", {
					skewX: gsap.utils.clamp(-16, 16, -velocity / 220),
					duration: 0.4,
					overwrite: true,
				});

				clearTimeout(settle);
				settle = setTimeout(() => {
					gsap.to(loop, { timeScale: 1, duration: 0.9, ease: "power2.out" });
					gsap.to(".marquee__item", { skewX: 0, duration: 0.6, ease: "power2.out" });
				}, 180);
			},
		});
	}

	/* -------- work rows dim their neighbours on hover -------- */
	const rows = gsap.utils.toArray(".work-row");

	rows.forEach((row) => {
		row.addEventListener("pointerenter", () => {
			gsap.to(rows.filter((r) => r !== row), { opacity: 0.3, duration: 0.4, overwrite: true });
		});
		row.addEventListener("pointerleave", () => {
			gsap.to(rows, { opacity: 1, duration: 0.4, overwrite: true });
		});
	});

	/* -------- footer wordmark parallax -------- */
	gsap.from(".footer-wordmark", {
		yPercent: 55,
		opacity: 0,
		ease: "none",
		scrollTrigger: {
			trigger: "footer",
			start: "top 70%",
			end: "bottom bottom",
			scrub: 1,
		},
	});

	/* -------- magnetic buttons -------- */
	gsap.utils.toArray(".magnetic").forEach((el) => {
		const xTo = gsap.quickTo(el, "x", { duration: 0.7, ease: "elastic.out(1, 0.4)" });
		const yTo = gsap.quickTo(el, "y", { duration: 0.7, ease: "elastic.out(1, 0.4)" });

		el.addEventListener("pointermove", (e) => {
			const r = el.getBoundingClientRect();
			xTo((e.clientX - r.left - r.width / 2) * 0.35);
			yTo((e.clientY - r.top - r.height / 2) * 0.35);
		});
		el.addEventListener("pointerleave", () => {
			xTo(0);
			yTo(0);
		});
	});

	/* -------- blend-mode cursor (fine pointers only) -------- */
	const cursor = document.querySelector(".cursor");

	if (cursor && window.matchMedia("(pointer: fine)").matches) {
		gsap.set(cursor, { xPercent: -50, yPercent: -50 });

		const cx = gsap.quickTo(cursor, "x", { duration: 0.45, ease: "power3" });
		const cy = gsap.quickTo(cursor, "y", { duration: 0.45, ease: "power3" });
		let cursorReady = false;

		window.addEventListener("pointermove", (e) => {
			// first move: jump to the pointer instead of sliding in from 0,0
			if (!cursorReady) {
				cursorReady = true;
				gsap.set(cursor, { x: e.clientX, y: e.clientY });
				cursor.style.opacity = "1";
			}
			cx(e.clientX);
			cy(e.clientY);
		}, { passive: true });

		document.querySelectorAll("a, button, input").forEach((el) => {
			el.addEventListener("pointerenter", () => gsap.to(cursor, { scale: 3.4, duration: 0.35 }));
			el.addEventListener("pointerleave", () => gsap.to(cursor, { scale: 1, duration: 0.35 }));
		});
	}

	/* =====================================================
	   LIQUID CURTAIN
	   Six columns with domed leading edges sweep up in a
	   stagger, so the edge reads as a wave rather than a
	   flat wipe. The scroll jump happens while covered, and
	   the curtain exits by continuing upward instead of
	   reversing — the motion never doubles back.
	   ===================================================== */

	// SplitText measures text, so remeasure once webfonts land
	document.fonts.ready.then(() => ScrollTrigger.refresh());

	CustomEase.create("curtain", "0.76, 0, 0.24, 1");

	const overlay = document.querySelector(".page-transition");
	const panels = gsap.utils.toArray(".page-transition__panel");

	// without the curtain markup, skip straight to the intro
	if (!overlay || !panels.length) {
		buildIntro();
		return;
	}

	const labelEl = overlay.querySelector(".page-transition__label");
	const indexEl = overlay.querySelector(".page-transition__index");
	const sections = gsap.utils.toArray("section");

	// cancels the CSS failsafe now that JS owns the curtain
	overlay.classList.add("is-live");

	// The domes are 12vh tall and centred on the panel edge, so 6vh of dome
	// always overhangs. Parking at +/-100 puts the panel edge exactly on the
	// viewport edge and leaves that overhang on screen -- hence 110.
	const PARKED = 110;

	const curtainIn = (label, position) => gsap.timeline()
		.set(overlay, { autoAlpha: 1, pointerEvents: "auto" })
		.set(panels, { yPercent: PARKED })
		.set([labelEl, indexEl], { opacity: 0 })
		.to(panels, {
			yPercent: 0,
			duration: 0.9,
			ease: "curtain",
			stagger: { each: 0.055, from: "start" },
		})
		.to([indexEl, labelEl], { opacity: 1, duration: 0.25 }, "-=0.5")
		.to(indexEl, {
			duration: 0.5,
			scrambleText: { text: position, chars: "0123456789", speed: 0.7 },
		}, "<")
		.to(labelEl, {
			duration: 0.7,
			scrambleText: { text: label, chars: "upperCase", speed: 0.6 },
		}, "<");

	const curtainOut = () => gsap.timeline()
		.to([labelEl, indexEl], { opacity: 0, duration: 0.3, ease: "power2.in" })
		.to(panels, {
			yPercent: -PARKED,
			duration: 0.9,
			ease: "curtain",
			stagger: { each: 0.055, from: "end" },
		}, "-=0.15")
		// belt and braces: nothing of the curtain can linger between transitions
		.set(overlay, { autoAlpha: 0, pointerEvents: "none" });

	let transitioning = false;

	document.querySelectorAll('a[href^="#"]').forEach((link) => {
		const hash = link.getAttribute("href");
		if (hash.length < 2) return;

		const target = document.querySelector(hash);
		if (!target) return;

		link.addEventListener("click", (event) => {
			event.preventDefault();
			if (transitioning) return;
			transitioning = true;

			const index = sections.indexOf(target);
			const position = index === -1 ? "00" : String(index + 1).padStart(2, "0");

			gsap.timeline({ onComplete: () => { transitioning = false; } })
				.add(curtainIn(link.textContent.trim(), position))
				.add(() => {
					gsap.set(window, { scrollTo: { y: target, autoKill: false } });
					ScrollTrigger.refresh();
				})
				.to({}, { duration: 0.25 })
				.add(curtainOut());
		});
	});

	/* -------- first load: counter, then hand off to the intro -------- */
	if (history.scrollRestoration) history.scrollRestoration = "manual";
	window.scrollTo(0, 0);
	document.documentElement.style.overflow = "hidden";

	const progress = { value: 0 };

	gsap.timeline({
		onComplete: () => {
			document.documentElement.style.overflow = "";
			ScrollTrigger.refresh();
		},
	})
		.set(overlay, { autoAlpha: 1, pointerEvents: "auto" })
		.set(panels, { yPercent: 0 })
		.to(progress, {
			value: 100,
			duration: 1.5,
			ease: "power2.inOut",
			onUpdate: () => {
				indexEl.textContent = String(Math.round(progress.value)).padStart(3, "0");
			},
		})
		.add(curtainOut(), "+=0.1")
		.add(buildIntro(), "-=0.55");
});
