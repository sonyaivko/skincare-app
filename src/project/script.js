// ====== CONFIG ======
const MODELS_URI = "./models";
await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URI);

// ====== DOM ======
const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const scanBtn = document.getElementById("scan-face-btn");
const videoBox = document.getElementById("video-container");
const seeResultBtn = document.getElementById("see-result-btn");

// Suggestions to show later (you can edit wording anytime)
const SUGGESTIONS = {
  oily: `Oily skin.
- Cleanser: gentle foaming/gel (AM/PM)
- Actives: niacinamide, BHA 2–3×/week
- Moisturizer: light gel-cream, non-comedogenic
- SPF: matte/gel SPF 30+`,

  combination: `Combination skin (T-zone shine).
- Cleanser: gentle gel
- Zone care: BHA on T-zone; hydrating serum (HA) on cheeks
- Moisturizer: light for T-zone, richer on dry areas
- SPF: lightweight SPF 30+`,

  dry: `Dry skin.
- Cleanser: creamy/milky
- Hydrators: HA, ceramides; gentle lactic weekly
- Moisturizer: rich cream (occlusive at night if needed)
- SPF: moisturizing SPF 30+`,
};

let modelsLoaded = false;
let loopId = null;

// ====== Load model(s) once ======
async function loadModelsOnce() {
  if (modelsLoaded) return;
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URI);
  // If you later need landmarks:
  // await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URI);
  modelsLoaded = true;
}

// ====== Start webcam ======
async function startWebCam() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
    audio: false,
  });
  video.setAttribute("playsinline", "true");
  video.srcObject = stream;
  await video.play();
}

// ====== Shine heuristic ======
function brightRatioInRegion(ctx, sx, sy, sw, sh) {
  const img = ctx.getImageData(sx, sy, sw, sh);
  const data = img.data;
  const total = sw * sh;

  let sum = 0,
    sumSq = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const Y = 0.299 * r + 0.587 * g + 0.114 * b; // luma
    sum += Y;
    sumSq += Y * Y;
  }
  const mean = sum / total;
  const variance = Math.max(0, sumSq / total - mean * mean);
  const std = Math.sqrt(variance);
  const threshold = mean + 1.5 * std;

  let bright = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const Y = 0.299 * r + 0.587 * g + 0.114 * b;
    if (Y >= threshold && r > 180 && g > 180 && b > 180) bright++;
  }
  return bright / total; // 0..1
}

function classifyFromBrightRatio(r) {
  if (r > 0.12) return "oily";
  if (r > 0.04) return "combination";
  return "dry";
}

// ====== Main scan loop (detect face + analyze shine) ======
async function runScanLoop() {
  const ctx = overlay.getContext("2d");
  overlay.width = video.videoWidth || 600;
  overlay.height = video.videoHeight || 450;

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 256,
    scoreThreshold: 0.5,
  });

  loopId = setInterval(async () => {
    const det = await faceapi.detectSingleFace(video, options);
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (!det) {
      seeResultBtn.style.display = "none";
      return;
    }

    const { x, y, width, height } = det.box;

    // Draw face box
    ctx.strokeStyle = "#09f";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);

    // Define a simple analysis region roughly on T-zone (center-top of face box)
    const tzX = Math.floor(x + width * 0.35);
    const tzY = Math.floor(y + height * 0.1);
    const tzW = Math.floor(width * 0.3);
    const tzH = Math.floor(height * 0.5);

    ctx.strokeStyle = "#0a0";
    ctx.strokeRect(tzX, tzY, tzW, tzH);

    // Snapshot current frame to offscreen canvas for pixel reading
    const off = document.createElement("canvas");
    off.width = overlay.width;
    off.height = overlay.height;
    const offCtx = off.getContext("2d");
    offCtx.drawImage(video, 0, 0, off.width, off.height);

    // Compute shine and classify
    const ratio = brightRatioInRegion(offCtx, tzX, tzY, tzW, tzH);
    const skinType = classifyFromBrightRatio(ratio);

    // Draw label
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x, Math.max(0, y - 24), 180, 22);
    ctx.fillStyle = "#fff";
    ctx.font = "16px sans-serif";
    ctx.fillText(
      `${skinType.toUpperCase()} ${(ratio * 100).toFixed(1)}%`,
      x + 6,
      Math.max(14, y - 8)
    );

    // Save result for result page
    localStorage.setItem("skinType", skinType);
    localStorage.setItem("shinePct", (ratio * 100).toFixed(1));
    localStorage.setItem("suggestions", SUGGESTIONS[skinType] || "");

    // Show “See Result” button
    seeResultBtn.style.display = "inline-block";
  }, 300);
}

// Button handlers
scanBtn?.addEventListener("click", async () => {
  try {
    videoBox.style.display = "block";
    await loadModelsOnce();
    await startWebCam();
    if (!loopId) await runScanLoop();
  } catch (e) {
    console.error(e);
    alert("Could not start camera or load models.");
  }
});

seeResultBtn?.addEventListener("click", () => {
  window.location.href = "result2.html";
});
