import './style.css';
import * as THREE from 'three';
import vertexShader from "./shaders/vertexShader.glsl";
import fragmentShader from "./shaders/fragmentShader.glsl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

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
	material.uniforms.uTime.value = timer.getElapsed();

	renderer.render(scene, camera);
}

animate();
