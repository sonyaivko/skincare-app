# Make Skin Better (MSB)

A skincare app that looks at your face through the camera, estimates your skin type, and gives
you a routine built around it. Everything happens on your machine. The camera feed is read
frame by frame in the browser and never uploaded anywhere.

Built in a two-person team at **HackUMass XIII**.


## Contents

- [What it does](#what-it-does)
- [How it works](#how-it-works)
  - [Face detection](#face-detection)
  - [The shine measurement](#the-shine-measurement)
  - [Classification](#classification)
  - [The desktop build](#the-desktop-build)
- [Project structure](#project-structure)
- [Running it](#running-it)
- [Known issues and limitations](#known-issues-and-limitations)
- [Possible improvements](#possible-improvements)
- [Credits](#credits)


## What it does

Sign up or log in (Firebase Authentication), then pick one of two paths:

- **Face scan** — the camera opens, finds your face, and reads the shine on your T-zone to
  estimate whether your skin is dry, combination, or oily
- **Questionnaire** — a multiple-choice survey for anyone who'd rather not turn the camera on

Either path lands on a results page with a full routine: morning and evening steps, what to
look for in a cleanser and moisturizer, lifestyle notes, and specific product suggestions.


## How it works

### Face detection

Uses **face-api.js** with the `TinyFaceDetector` model — a small, fast detector meant for
real-time use in a browser. It's loaded from local model files rather than a CDN, so the scan
works offline once the app is installed.

The scan loop runs every **300ms**: detect a single face, draw its bounding box, and derive a
smaller region from it.

### The shine measurement

The T-zone (forehead and nose) is where oily skin shows first, so the app samples a rectangle
positioned by proportion inside the detected face box — 35% in from the left, 10% down from
the top, 30% of the width, 50% of the height. Because it's proportional, it tracks correctly
whether you're close to the camera or far away.

Inside that region, every pixel is converted to **luminance** using the standard weighting:

```
Y = 0.299·R + 0.587·G + 0.114·B
```

The interesting part is the threshold. Rather than a fixed brightness cutoff — which would
break the moment the lighting changed — the app computes the **mean and standard deviation of
the region itself** and calls a pixel bright if it exceeds `mean + 1.5σ` and is near-white in
all three channels. So "shiny" is defined relative to the rest of your face, not against an
absolute value.

The result is a single number: the fraction of pixels in the T-zone that count as shine.

### Classification

```
ratio > 0.075  →  oily
ratio > 0.035  →  combination
otherwise      →  dry
```

Those thresholds were tuned by hand during the hackathon. The detected type and the shine
percentage are shown live on the video overlay, so you can watch the number move as you tilt
toward or away from a light.

### The desktop build

The Electron wrapper (`MSK-main.js`) does something slightly unusual: instead of loading the
HTML off disk, it starts a small **Express** server on port 1919 and points the window at
`http://localhost:1919`.

That's deliberate. Browsers block `getUserMedia` on `file://` origins, so a desktop app that
loaded its pages directly from disk would have no camera at all. Serving over localhost gives
it a proper origin.

The window runs with `contextIsolation: true`, `sandbox: true` and `nodeIntegration: false` —
the renderer gets no direct access to Node.

`electron-builder` packages it for all three platforms: `.dmg` on macOS, NSIS installer on
Windows, AppImage on Linux.


## Project structure

```
MSK-main.js              Electron entry point — starts Express, opens the window
package.json             Scripts and electron-builder config
src/project/
  index.html             Landing / login
  signup.html            Sign-up
  welcome.html           Logged-in home, with the face scan option
  questionnaire.html     Multiple-choice survey
  results.html           Results from the questionnaire
  results2.html          Results from the face scan
  script.js              Scan loop, shine heuristic, classification, routine content
  firebase-init.js       Firebase Authentication setup
src/build/               App icons for the desktop build
```

---

## Running it

### In a browser

```bash
npx serve
```

Then open the link it prints. A plain `file://` open won't work — the camera needs an http
origin.

### As a desktop app

```bash
npm install
npm run dist
```

The build lands in `dist/`, under a per-platform folder — on macOS,
`dist/mac/Make Skin Better.app`.

For development without packaging:

```bash
npm install
npm start
```


## Known issues and limitations

**This is not a dermatological assessment.** It measures one thing — how much light your
T-zone reflects — and maps it to three categories. Real skin typing considers pore size,
texture, hydration, sensitivity and history. Treat the output as a starting point for
choosing a moisturizer, not as a diagnosis.

**Lighting dominates the result.** The adaptive threshold handles overall brightness, but a
strong directional light, a window behind you, or a screen reflecting off your forehead will
all read as shine. Consistent, even lighting gives more consistent results.

**The thresholds aren't validated.** `0.075` and `0.035` were picked by trial during a
hackathon weekend. They were not tested against a labelled dataset.

**Skin tone affects the measurement.** Specular highlights read differently across skin tones,
and a luminance-based threshold tuned on a small group will not generalise evenly. Fixing this
properly needs a diverse labelled dataset — it is a real limitation, not a rounding error.

**One face at a time.** `detectSingleFace` returns only the most confident detection.

**The T-zone region assumes a level head.** It's a fixed proportion of the face box, so a
significant tilt moves the sample window off the forehead.

**Results are stored in `localStorage`, not in Firebase.** Firebase handles login only — your
scan history isn't saved to your account and won't follow you to another device.

**Check the results page filename.** The README lists `results2.html` but `script.js`
navigates to `result2.html`. One of the two is wrong; worth confirming which.

**The model loads twice** — once at the top of `script.js` and again inside `loadModelsOnce()`.
Harmless, but redundant.


## Credits

Built by Mariia Palamarchuk ([@mariiaplm](https://github.com/mariiaplm)) and Sonya Ivko ([@sonyaivko](https://github.com/sonyaivko)) at HackUMass XIII.

Face detection by [face-api.js](https://github.com/justadudewhohacks/face-api.js). Desktop
packaging with [Electron](https://www.electronjs.org/) and
[electron-builder](https://www.electron.build/). Authentication by
[Firebase](https://firebase.google.com/).
