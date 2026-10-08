// src/utils/electronBridge.js
const isElectron = () => typeof window !== 'undefined' && !!window.electronAPI;

const safeInvoke = async (fn, ...args) => {
  try {
    if (!isElectron()) return { success: false, error: 'Não está no Electron' };
    const res = await fn(...args);
    return res;
  } catch (error) {
    console.error('electronBridge error:', error);
    return { success: false, error: error.message };
  }
}

export const electronAPI = {
  setAutoLaunch: (enable) => safeInvoke(window.electronAPI.setAutoLaunch, enable),
  checkAutoLaunch: () => safeInvoke(window.electronAPI.checkAutoLaunch),
  getPrinters: () => safeInvoke(window.electronAPI.getPrinters),
  printOrder: (printerName, htmlContent) => safeInvoke(window.electronAPI.printOrder, printerName, htmlContent),
  setPowerBlocker: (enable) => safeInvoke(window.electronAPI.setPowerBlocker, enable),
  sendNotification: (title, body) => safeInvoke(window.electronAPI.sendNotification, title, body),
  onUpdateAvailable: (cb) => {
    if (!isElectron()) return
    window.electronAPI.onUpdateAvailable(cb)
  },
  onUpdateDownloadProgress: (cb) => {
    if (!isElectron()) return
    window.electronAPI.onUpdateDownloadProgress(cb)
  },
  onUpdateDownloaded: (cb) => {
    if (!isElectron()) return
    window.electronAPI.onUpdateDownloaded(cb)
  },
  offUpdaterEvents: () => {
    if (!isElectron()) return
    window.electronAPI.offUpdaterEvents()
  },
  installUpdate: () => safeInvoke(window.electronAPI.installUpdate),
  isElectron,
};

export default electronAPI;
