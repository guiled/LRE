import esbuild from 'esbuild';

esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    minify: false,
    outfile: 'build/lre.tmp.js',
    format: 'iife',
    define: {
        'console.log': 'log',
    }
});