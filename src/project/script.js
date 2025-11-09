const results = {
  dry: `
    <h2>Dry Skin</h2>
    <p>Your skin produces less natural oil and can often feel tight, rough, or flaky, especially in colder weather. The key is to restore and lock in moisture.</p>
    <ul>
      <li>Start your day with a gentle, creamy cleanser that won’t strip away hydration, followed by a toner or essence rich in hyaluronic acid or glycerin.</li>
      <li>Use a thick, nourishing moisturizer and finish with a hydrating sunscreen.</li>
      <li>At night, cleanse again softly, apply a hyaluronic-acid or niacinamide serum, and seal everything in with a richer cream or an overnight mask.</li>
      <li>A few drops of facial oil in winter can make a big difference.</li>
    </ul>
    <p>Your lifestyle can also aid in making your skin better!</p>
    <ul>
      <li>Drink plenty of water, avoid long hot showers, and consider using a humidifier.</li>
      <li>Foods rich in healthy fats like salmon, avocado, and nuts help your skin from within.</li>
    </ul>
    <p><strong>Popular picks:</strong> CeraVe Hydrating Cleanser, Neutrogena Hydro Boost Gel Cream, The Ordinary Hyaluronic Acid Serum, EltaMD UV Daily SPF 40.</p>
  `,
  oily: `
    <h2>Oily Skin</h2>
    <p>Your skin naturally produces more sebum, leading to shine and occasional breakouts. The goal is to balance oil without stripping the skin.</p>
    <ul>
      <li>Use a foaming or gel-based cleanser to remove excess oil, followed by a lightweight, oil-free moisturizer to keep your skin hydrated without heaviness.</li>
      <li>Always wear sunscreen; many matte finishes work well for oily skin.</li>
      <li>At night, double-cleanse if you wear makeup and apply a serum containing niacinamide or salicylic acid to reduce oil buildup and minimize pores.</li>
      <li>Exfoliate 2–3 times a week with a gentle BHA to prevent clogged pores, and try to avoid touching your face throughout the day.</li>
    </ul>
    <p>A balanced diet, regular exercise, and stress management all help regulate oil production.</p>
    <p><strong>Popular picks:</strong> La Roche-Posay Effaclar Gel Cleanser, CeraVe Foaming Cleanser, The Ordinary Niacinamide 10% + Zinc, COSRX Oil-Free Moisturizer, Supergoop! Unseen SPF 40.</p>
  `,
  combo: `
    <h2>Combination Skin</h2>
    <p>Your skin behaves differently in different areas: oily on the T-zone (forehead, nose, chin) and dry on the cheeks or jawline. The goal is to maintain balance.</p>
    <ul>
      <li>Choose a gentle, low-foam cleanser that removes oil but doesn’t dry out your skin.</li>
      <li>Apply a light, hydrating moisturizer in the morning and use a richer cream only on dry areas at night.</li>
      <li>Layering different products for different zones can be very effective — for example, mattifying gel on the T-zone and a soothing cream on the cheeks.</li>
      <li>Once or twice a week, exfoliate gently to remove buildup and use clay masks on oily areas and hydrating masks elsewhere.</li>
      <li>Keep your routine flexible with the seasons — your skin may act more dry in winter and more oily in summer.</li>
    </ul>
    <p><strong>Popular picks:</strong> CeraVe Hydrating Foam Cleanser, Paula’s Choice Pore-Refining Toner, Neutrogena Hydro Boost Water Gel, Laneige Cream Skin Refiner, Eucerin Oil Control SPF 50.</p>
  `,
};

const MODELS_URI = "./models";
await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URI);

// ====== DOM ======
const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const scanBtn = document.getElementById("scan-face-btn");
const videoBox = document.getElementById("video-container");
const seeResultBtn = document.getElementById("see-result-btn");

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
  if (r > 0.075) return "oily";
  if (r > 0.035) return "combination";
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

    localStorage.setItem("skinType", skinType);
    localStorage.setItem("shinePct", (ratio * 100).toFixed(1));

    const htmlText = results[skinType === "combination" ? "combo" : skinType];
    localStorage.setItem("skinDescription", htmlText);

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
