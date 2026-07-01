import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");

const frameRate = 30;
const frameSize = 320;
const referenceVideoPath = path.join(webRoot, "public", "brand", "kros-intro.mp4");
const sourceLogoPath = existsSync(path.join(webRoot, "public", "brand", "kros-logo-vector.svg"))
  ? path.join(webRoot, "public", "brand", "kros-logo-vector.svg")
  : path.join(webRoot, "public", "kroslogo-menu.png");
const outputDir = path.join(webRoot, "public", "brand");
const outputSpritePath = path.join(outputDir, "kros-intro-sprite.png");
const outputMetaPath = path.join(outputDir, "kros-intro-sprite.json");

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function unmattFromWhite(channel, alpha) {
  if (alpha <= 0.015) return 0;
  return Math.max(0, Math.min(255, Math.round((channel - (1 - alpha) * 255) / alpha)));
}

async function createStaticServer() {
  function streamWithRange(req, res, filePath, contentType) {
    const stat = statSync(filePath);
    let start = 0;
    let end = stat.size - 1;
    let status = 200;
    const headers = {
      "Accept-Ranges": "bytes",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
      "Content-Type": contentType,
    };

    const range = req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (match) {
        if (match[1]) start = Number(match[1]);
        if (match[2]) end = Number(match[2]);
        if (!match[1] && match[2]) {
          const suffixLength = Number(match[2]);
          start = Math.max(stat.size - suffixLength, 0);
          end = stat.size - 1;
        }

        start = Math.max(0, Math.min(start, stat.size - 1));
        end = Math.max(start, Math.min(end, stat.size - 1));
        status = 206;
        headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
      }
    }

    headers["Content-Length"] = end - start + 1;
    res.writeHead(status, headers);
    createReadStream(filePath, { start, end }).pipe(res);
  }

  const server = http.createServer((req, res) => {
    const requestPath = req.url?.split("?")[0];
    if (requestPath === "/brand/kros-intro.mp4") {
      streamWithRange(req, res, referenceVideoPath, "video/mp4");
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not start local asset server.");
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function withBrowser(extract) {
  const attempts = [
    { channel: "chrome", label: "Google Chrome" },
    { channel: "msedge", label: "Microsoft Edge" },
    { channel: undefined, label: "Playwright Chromium" },
  ];

  let lastError;
  for (const attempt of attempts) {
    let browser;
    try {
      browser = await chromium.launch({
        ...(attempt.channel ? { channel: attempt.channel } : {}),
        headless: true,
      });
      return await extract(browser, attempt.label);
    } catch (error) {
      lastError = error;
      console.warn(`[kros-intro] ${attempt.label} could not decode the reference video.`);
    } finally {
      await browser?.close();
    }
  }

  throw lastError ?? new Error("Could not launch a browser capable of decoding the reference video.");
}

async function extractReferenceFrames(origin) {
  return withBrowser(async (browser, browserLabel) => {
    const page = await browser.newPage({ viewport: { width: frameSize, height: frameSize } });
    const result = await page.evaluate(
      async ({ frameRate: fps, frameSize: size, videoUrl }) => {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        video.src = videoUrl;

        await new Promise((resolve, reject) => {
          video.addEventListener("loadedmetadata", resolve, { once: true });
          video.addEventListener(
            "error",
            () => reject(new Error(video.error?.message || `Video error ${video.error?.code}`)),
            { once: true },
          );
        });

        await new Promise((resolve, reject) => {
          video.addEventListener("loadeddata", resolve, { once: true });
          video.addEventListener(
            "error",
            () => reject(new Error(video.error?.message || `Video error ${video.error?.code}`)),
            { once: true },
          );
        });

        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Could not create canvas context.");
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";

        const duration = video.duration;
        const frameCount = Math.round(duration * fps);
        const frames = [];

        async function seekTo(time) {
          if (Math.abs(video.currentTime - time) < 0.0005 && video.readyState >= 2) {
            return;
          }
          await new Promise((resolve, reject) => {
            const cleanup = () => {
              video.removeEventListener("seeked", handleSeeked);
              video.removeEventListener("error", handleError);
            };
            const handleSeeked = () => {
              cleanup();
              resolve();
            };
            const handleError = () => {
              cleanup();
              reject(new Error(video.error?.message || `Video error ${video.error?.code}`));
            };
            video.addEventListener("seeked", handleSeeked, { once: true });
            video.addEventListener("error", handleError, { once: true });
            video.currentTime = time;
          });
        }

        for (let frame = 0; frame < frameCount; frame += 1) {
          const time = Math.min(frame / fps, duration - 0.001);
          await seekTo(time);
          context.clearRect(0, 0, size, size);
          context.drawImage(video, 0, 0, size, size);
          frames.push(canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, ""));
        }

        return {
          duration,
          durationMs: Math.round(duration * 1000),
          frameCount,
          frames,
          videoHeight: video.videoHeight,
          videoWidth: video.videoWidth,
        };
      },
      {
        frameRate,
        frameSize,
        videoUrl: `${origin}/brand/kros-intro.mp4`,
      },
    );

    await page.close();
    console.log(
      `[kros-intro] decoded ${result.frameCount} frames from ${result.videoWidth}x${result.videoHeight} video with ${browserLabel}`,
    );
    return result;
  });
}

async function createSourceLogo() {
  const { data, info } = await sharp(sourceLogoPath)
    .resize(frameSize, frameSize, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelCount = info.width * info.height;
  const alpha = new Uint8Array(pixelCount);
  const color = Buffer.alloc(pixelCount * 3);

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const a = data[offset + 3] / 255;
    const matteAlpha = clamp01(((252 - luminance(r, g, b)) / 74) * a);

    alpha[index] = Math.round(matteAlpha * 255);
    color[index * 3] = unmattFromWhite(r, matteAlpha);
    color[index * 3 + 1] = unmattFromWhite(g, matteAlpha);
    color[index * 3 + 2] = unmattFromWhite(b, matteAlpha);
  }

  return { alpha, color, pixelCount };
}

function createReferencePixel(r, g, b) {
  const alpha = clamp01((255 - luminance(r, g, b) - 4) / 54);
  const fallback = alpha > 0.015 ? unmattFromWhite(luminance(r, g, b), alpha) : 0;

  return {
    alpha,
    color: [
      alpha > 0.015 ? unmattFromWhite(r, alpha) : fallback,
      alpha > 0.015 ? unmattFromWhite(g, alpha) : fallback,
      alpha > 0.015 ? unmattFromWhite(b, alpha) : fallback,
    ],
  };
}

async function buildFrame(referenceBase64, sourceLogo, frameIndex, frameCount) {
  const reference = await sharp(Buffer.from(referenceBase64, "base64"))
    .ensureAlpha()
    .raw()
    .toBuffer();
  const output = Buffer.alloc(sourceLogo.pixelCount * 4);
  const finishMix = clamp01((frameIndex - (frameCount - 7)) / 6);
  const isFinalFrame = frameIndex === frameCount - 1;

  for (let index = 0; index < sourceLogo.pixelCount; index += 1) {
    const refOffset = index * 4;
    const sourceOffset = index * 3;
    const outOffset = index * 4;
    const sourceAlpha = sourceLogo.alpha[index] / 255;

    const referencePixel = createReferencePixel(
      reference[refOffset],
      reference[refOffset + 1],
      reference[refOffset + 2],
    );

    let alpha = referencePixel.alpha;
    let r = referencePixel.color[0];
    let g = referencePixel.color[1];
    let b = referencePixel.color[2];

    if (sourceAlpha > 0.01) {
      const sourceR = sourceLogo.color[sourceOffset];
      const sourceG = sourceLogo.color[sourceOffset + 1];
      const sourceB = sourceLogo.color[sourceOffset + 2];
      const sourceMix = Math.max(finishMix, sourceAlpha > 0.94 ? 0.18 : 0);

      r = Math.round(r * (1 - sourceMix) + sourceR * sourceMix);
      g = Math.round(g * (1 - sourceMix) + sourceG * sourceMix);
      b = Math.round(b * (1 - sourceMix) + sourceB * sourceMix);
      alpha = Math.max(alpha, sourceAlpha * finishMix);
    }

    if (isFinalFrame) {
      alpha = sourceAlpha;
      r = sourceLogo.color[sourceOffset];
      g = sourceLogo.color[sourceOffset + 1];
      b = sourceLogo.color[sourceOffset + 2];
    }

    output[outOffset] = r;
    output[outOffset + 1] = g;
    output[outOffset + 2] = b;
    output[outOffset + 3] = Math.round(clamp01(alpha) * 255);
  }

  return output;
}

function copyFrameIntoSprite(sprite, frame, frameIndex, spriteWidth) {
  const destinationX = frameIndex * frameSize;
  const rowLength = frameSize * 4;

  for (let y = 0; y < frameSize; y += 1) {
    const sourceStart = y * rowLength;
    const destinationStart = (y * spriteWidth + destinationX) * 4;
    frame.copy(sprite, destinationStart, sourceStart, sourceStart + rowLength);
  }
}

async function main() {
  if (!existsSync(referenceVideoPath)) {
    throw new Error(`Missing reference video: ${referenceVideoPath}`);
  }
  if (!existsSync(sourceLogoPath)) {
    throw new Error(`Missing source logo: ${sourceLogoPath}`);
  }

  await mkdir(outputDir, { recursive: true });
  const server = await createStaticServer();

  try {
    const reference = await extractReferenceFrames(server.origin);
    const sourceLogo = await createSourceLogo();
    const spriteWidth = frameSize * reference.frameCount;
    const sprite = Buffer.alloc(spriteWidth * frameSize * 4);

    for (let frameIndex = 0; frameIndex < reference.frameCount; frameIndex += 1) {
      const frame = await buildFrame(reference.frames[frameIndex], sourceLogo, frameIndex, reference.frameCount);
      copyFrameIntoSprite(sprite, frame, frameIndex, spriteWidth);
    }

    await sharp(sprite, {
      raw: {
        channels: 4,
        height: frameSize,
        width: spriteWidth,
      },
    })
      .png({ compressionLevel: 9, palette: false })
      .toFile(outputSpritePath);

    const metadata = {
      durationMs: reference.durationMs,
      frameCount: reference.frameCount,
      frameHeight: frameSize,
      frameRate,
      frameWidth: frameSize,
      sourceLogo: path.relative(webRoot, sourceLogoPath).replaceAll("\\", "/"),
      spriteHeight: frameSize,
      spriteWidth,
    };
    await writeFile(outputMetaPath, `${JSON.stringify(metadata, null, 2)}\n`);

    console.log(`[kros-intro] wrote ${path.relative(webRoot, outputSpritePath)}`);
    console.log(`[kros-intro] wrote ${path.relative(webRoot, outputMetaPath)}`);
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
