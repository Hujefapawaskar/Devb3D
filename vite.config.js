import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import tailwindcss from '@tailwindcss/vite';

// The site is published at https://hujefapawaskar.github.io/Devb3D/ , so every
// asset URL must be prefixed with /Devb3D/ .
// Set unconditionally: `vite preview` reports command === 'serve', so making
// this conditional on 'build' would leave preview serving at / while the built
// HTML points at /Devb3D/ . Dev + preview now run at http://localhost:PORT/Devb3D/
export default defineConfig({
	base: '/Devb3D/',
	plugins: [glsl(), tailwindcss()],
});
