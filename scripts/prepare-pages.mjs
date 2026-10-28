import { cp, copyFile, mkdir, rm } from 'node:fs/promises';

// Keep branch-based GitHub Pages and the Actions artifact on the same build.
await copyFile('dist/app.html', 'dist/index.html');
await copyFile('dist/index.html', 'index.html');
await rm('assets', { recursive: true, force: true });
await mkdir('assets', { recursive: true });
await cp('dist/assets', 'assets', { recursive: true });
await copyFile('dist/favicon.svg', 'favicon.svg');
