import { cp, copyFile, writeFile } from 'node:fs/promises';

// GitHub Pages serves the repository root. Keep development sources in app/.
await cp(new URL('../dist/assets/', import.meta.url), new URL('../assets/', import.meta.url), { recursive: true });
await copyFile(new URL('../dist/index.html', import.meta.url), new URL('../index.html', import.meta.url));
await copyFile(new URL('../dist/favicon.svg', import.meta.url), new URL('../favicon.svg', import.meta.url));
await writeFile(new URL('../.nojekyll', import.meta.url), '');
console.log('Página preparada en la raíz para GitHub Pages.');
