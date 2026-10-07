import { copyFile, cp, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
const require=createRequire(import.meta.url)
await mkdir('.output/server/_libs',{recursive:true})
await copyFile(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs'),'.output/server/_libs/pdf.worker.mjs')
// pdfjs loads native canvas dynamically, so Nitro cannot trace the platform binary.
// Copy the dependency installed for the build platform (Linux in the Docker build).
await cp('node_modules/@napi-rs','.output/server/node_modules/@napi-rs',{recursive:true})
console.log('Bundled the PDF worker and native canvas dependency for production extraction.')
