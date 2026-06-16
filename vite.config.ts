import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import obfuscatorPlugin from 'rollup-plugin-obfuscator'

// `isSsrBuild` is true for the Node-render pass that vite-react-ssg runs to
// prerender routes. The javascript-obfuscator plugin breaks that Node render,
// so we only apply it to the client build.
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  define: {
    'process.env': {}
  },
  server: {
    port: 3000,
    host: true
  },
  ssr: {
    // react-icons ships ESM that Node's resolver chokes on during prerender;
    // bundling it (noExternal) fixes the crash.
    noExternal: ['react-icons'],
  },
  ssgOptions: {
    entry: 'src/main.tsx',
    dirStyle: 'nested',
    // Only the 6 public marketing routes are prerendered to static HTML. Every
    // other route stays a client-only SPA route (served the index shell via the
    // Firebase ** rewrite).
    includedRoutes: () => [
      '/',
      '/about',
      '/contact',
      '/learn-more',
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
      },
      mangle: {
        toplevel: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      plugins: isSsrBuild
        ? []
        : [
            obfuscatorPlugin({
              options: {
                compact: true,
                controlFlowFlattening: true,
                controlFlowFlatteningThreshold: 0.5,
                deadCodeInjection: true,
                deadCodeInjectionThreshold: 0.2,
                identifierNamesGenerator: 'hexadecimal',
                renameGlobals: false,
                stringArray: true,
                stringArrayThreshold: 0.5,
                stringArrayEncoding: ['base64'],
                splitStrings: true,
                splitStringsChunkLength: 10,
                selfDefending: false,
                // Fixed seed → deterministic obfuscation output across builds.
                seed: 20260616,
              },
            }),
          ],
    },
  },
}))
