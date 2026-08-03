const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  ipcMain,
  shell,
} = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const appUrl = "http://127.0.0.1:5173";
let mainWindow;
let ownedServer;

async function localServiceIsReady() {
  try {
    const response = await fetch(`${appUrl}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function startLocalService() {
  if (await localServiceIsReady()) return;
  const serverModule = await import(
    pathToFileURL(path.join(__dirname, "..", "server", "index.js")).href
  );
  ownedServer = await serverModule.startServer({
    storageDir: path.join(app.getPath("userData"), "workspace"),
    port: 5173,
    host: "127.0.0.1",
  });
}

function isApprovedSearchUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const approvedTargets = [
      ["www.google.com", "/search"],
      ["www.bing.com", "/search"],
      ["yandex.com", "/search/"],
      ["github.com", "/search"],
      ["web.archive.org", "/cdx/search/cdx"],
    ];
    return approvedTargets.some(
      ([hostname, pathname]) =>
        parsed.hostname === hostname && parsed.pathname === pathname,
    );
  } catch {
    return false;
  }
}

async function openSearch(url) {
  if (!isApprovedSearchUrl(url)) return { ok: false };
  await shell.openExternal(url);
  return { ok: true };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 930,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: "#0B0B0D",
    title: "dorkA",
    icon: path.join(__dirname, "..", "dorkA.ico"),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.loadURL(appUrl);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void openSearch(url);
    return { action: "deny" };
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("dorka:open-search", (_event, url) => openSearch(url));

app
  .whenReady()
  .then(async () => {
    Menu.setApplicationMenu(null);
    await startLocalService();
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  })
  .catch((error) => {
    dialog.showErrorBox("dorkA could not start", error.message);
    app.quit();
  });

app.on("before-quit", () => {
  if (ownedServer) ownedServer.close();
});
