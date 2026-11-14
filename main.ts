import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(__dirname, 'entry.png');

// Resolve output directory against process.cwd() if relative, defaulting to /output
const rawOutDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const outDir = path.isAbsolute(rawOutDir) ? rawOutDir : path.resolve(process.cwd(), rawOutDir);
const destPath = path.join(outDir, 'entry.png');

// Check source existence and stats
if (!fs.existsSync(srcPath)) {
  console.error(`Error: Source file not found at ${srcPath}`);
  process.exit(1);
}

const srcStats = fs.statSync(srcPath);
if (srcStats.size > 1048576) {
  console.error(`Error: Source file size (${srcStats.size} bytes) exceeds maximum allowed 1048576 bytes.`);
  process.exit(1);
}

// Verify JPEG magic bytes (FF D8 FF)
const headerBuf = Buffer.alloc(3);
const fd = fs.openSync(srcPath, 'r');
fs.readSync(fd, headerBuf, 0, 3, 0);
fs.closeSync(fd);

if (headerBuf[0] !== 0xff || headerBuf[1] !== 0xd8 || headerBuf[2] !== 0xff) {
  console.error(`Error: Source file is not a valid JPEG (header bytes: ${headerBuf.toString('hex')}).`);
  process.exit(1);
}

// Compute source SHA-256
const srcBuffer = fs.readFileSync(srcPath);
const srcHash = crypto.createHash('sha256').update(srcBuffer).digest('hex');

// Create output directory if needed
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Copy file
fs.copyFileSync(srcPath, destPath);

// Verify destination exists explicitly and check stats/hash
if (!fs.existsSync(destPath)) {
  console.error(`Error: Destination file does not exist at ${destPath} after copy.`);
  process.exit(1);
}

const destStats = fs.statSync(destPath);
const destBuffer = fs.readFileSync(destPath);
const destHash = crypto.createHash('sha256').update(destBuffer).digest('hex');

if (destStats.size !== srcStats.size || destHash !== srcHash) {
  console.error(`Error: Destination verification failed. Size match: ${destStats.size === srcStats.size} (${destStats.size} vs ${srcStats.size}), Hash match: ${destHash === srcHash}`);
  process.exit(1);
}

console.log(`Source size: ${srcStats.size}`);
console.log(`Source SHA-256: ${srcHash}`);
console.log(`Destination size: ${destStats.size}`);
console.log(`Destination SHA-256: ${destHash}`);
