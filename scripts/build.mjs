import { build } from 'esbuild';
await build({entryPoints:['src/main.tsx'],outfile:'public/app.js',bundle:true,minify:true,jsx:'automatic',target:'es2022',define:{'process.env.NODE_ENV':'"production"'},legalComments:'eof'});
console.log('Built public/app.js');
