const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadFile('index.html')

  ipcMain.handle('open-html-files', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      filters: [{ name: 'HTML Files', extensions: ['html', 'htm'] }],
      properties: ['openFile', 'multiSelections']
    })
    if (canceled || filePaths.length === 0) return []
    return filePaths.map(filePath => ({
      name: path.basename(filePath),
      content: fs.readFileSync(filePath, 'utf-8')
    }))
  })

  const http = require('http'); // or use 'node-fetch' if you prefer

  ipcMain.handle('llm-generate', async (event, { model, prompt }) => {
    // Using Node's http for compatibility, but you can use fetch if available
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model,
        prompt,
        stream: false
      });

      const req = http.request({
        hostname: 'localhost',
        port: 11434,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      }, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            resolve(json.response || body);
          } catch (e) {
            resolve(body);
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  });
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})