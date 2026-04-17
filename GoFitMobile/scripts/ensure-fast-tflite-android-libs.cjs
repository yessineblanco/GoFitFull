/**
 * react-native-fast-tflite npm releases omit android/src/main/cpp/lib (see package.json "files").
 * Without JNI .so + C headers, Android CMake fails on EAS/local (TFLITE / TFLITE_GPU NOTFOUND).
 * This script repopulates that tree from Maven Central AARs (same layout Margelo's build expects).
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const TF_LITE_VERSION = '2.14.0';
const MAVEN = 'https://repo1.maven.org/maven2/org/tensorflow';

const AARS = [
  `${MAVEN}/tensorflow-lite/${TF_LITE_VERSION}/tensorflow-lite-${TF_LITE_VERSION}.aar`,
  `${MAVEN}/tensorflow-lite-gpu/${TF_LITE_VERSION}/tensorflow-lite-gpu-${TF_LITE_VERSION}.aar`,
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeEntry(buffer, outPath) {
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, buffer);
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`[ensure-fast-tflite-libs] ${res.status} ${url}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function extractBaseAar(zip, jniDest, headersDest) {
  for (const entry of zip.getEntries()) {
    const name = entry.entryName.replace(/\\/g, '/');
    if (entry.isDirectory) continue;
    if (name.startsWith('jni/')) {
      const rel = name.slice('jni/'.length);
      writeEntry(entry.getData(), path.join(jniDest, rel));
    }
    if (name.startsWith('headers/tensorflow/lite/')) {
      const rel = name.slice('headers/tensorflow/lite/'.length);
      writeEntry(entry.getData(), path.join(headersDest, 'tflite', rel));
    }
  }
}

function extractGpuJniOnly(zip, jniDest) {
  for (const entry of zip.getEntries()) {
    const name = entry.entryName.replace(/\\/g, '/');
    if (entry.isDirectory) continue;
    if (name.startsWith('jni/')) {
      const rel = name.slice('jni/'.length);
      writeEntry(entry.getData(), path.join(jniDest, rel));
    }
  }
}

async function main() {
  const root = path.join(__dirname, '..');
  const pkgRoot = path.join(root, 'node_modules', 'react-native-fast-tflite');
  if (!fs.existsSync(path.join(pkgRoot, 'package.json'))) {
    console.log('[ensure-fast-tflite-libs] react-native-fast-tflite not installed, skip');
    return;
  }

  const jniDest = path.join(pkgRoot, 'android', 'src', 'main', 'cpp', 'lib', 'litert', 'jni');
  const headersDest = path.join(pkgRoot, 'android', 'src', 'main', 'cpp', 'lib', 'litert', 'headers');
  const marker = path.join(jniDest, '.gofit-fetched-tf-lite');

  const probe = path.join(jniDest, 'arm64-v8a', 'libtensorflowlite_jni.so');
  if (fs.existsSync(probe) && fs.existsSync(path.join(headersDest, 'tflite', 'c', 'c_api.h'))) {
    console.log('[ensure-fast-tflite-libs] LiteRT jni+headers already present, skip');
    return;
  }

  ensureDir(jniDest);
  ensureDir(headersDest);

  const baseBuf = await fetchBuffer(AARS[0]);
  extractBaseAar(new AdmZip(baseBuf), jniDest, headersDest);

  const gpuBuf = await fetchBuffer(AARS[1]);
  extractGpuJniOnly(new AdmZip(gpuBuf), jniDest);

  fs.writeFileSync(
    marker,
    `Populated from Maven org.tensorflow tensorflow-lite / tensorflow-lite-gpu ${TF_LITE_VERSION} for GoFit Android builds.\n`,
  );
  console.log('[ensure-fast-tflite-libs] extracted TensorFlow Lite AARs into react-native-fast-tflite');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
