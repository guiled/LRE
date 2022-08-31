import esbuild from 'esbuild';

esbuild.build({
    entryPoints: ['src/lre.ts'],
    bundle: true,
    minify: false,
    outfile: 'build/lre.tmp.js',
    format: 'esm',
    define: {
        'console.log': 'log',
    }
});