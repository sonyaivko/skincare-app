const { app, BrowserWindow, nativeImage } = require("electron");
const path = require("path");
const express = require("express");

const PORT = process.env.PORT || 1919;
let server;

app.setName("Make Skin Better");

const devIconPath = path.join(__dirname, "src", "build", "icon.png");

try {
  if (process.platform === "darwin") {
    const dockIcon = nativeImage.createFromPath(devIconPath);
    if (app.dock && dockIcon && !dockIcon.isEmpty()) app.dock.setIcon(dockIcon);
  }
} catch (err) {
  console.warn("Could not set Dock icon:", err.message);
}

async function startServer() {
  const s = express();
  s.use(express.static(path.join(__dirname, "src", "project")));
  await new Promise((resolve) => {
    server = s.listen(PORT, resolve);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Make Skin Better",
    icon: devIconPath,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  win.loadURL(`http://localhost:${PORT}/index.html`);
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", () => {
  try {
    if (server) server.close();
  } catch {}
});
