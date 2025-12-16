const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

// Disable hardware acceleration to avoid permission issues in some environments, though probably fine here.
app.disableHardwareAcceleration();

app.whenReady().then(() => {
    const win = new BrowserWindow({
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    const sourcePath = 'C:/Users/bwend/.gemini/antigravity/brain/b4c73ec3-179e-4f24-9934-d052c8bb0b7d/icon_variant_minimalist_1765900850889.png';
    // Ensure build dir exists (we did it in step before, but good practice)
    const destPath = path.join(process.cwd(), 'build', 'icon.png');

    console.log(`Processing ${sourcePath} -> ${destPath}`);

    const fileData = fs.readFileSync(sourcePath).toString('base64');
    const dataUrl = `data:image/png;base64,${fileData}`;

    const html = `
    <html>
    <body>
    <script>
        const { ipcRenderer } = require('electron');
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Replace white and near-white pixels (threshold 200)
            let pixelsRemoved = 0;
            for (let i = 0; i < data.length; i += 4) {
                 const r = data[i];
                 const g = data[i+1];
                 const b = data[i+2];
                 // Check for white/off-white
                 if (r > 200 && g > 200 && b > 200) {
                     data[i+3] = 0; // Transparent
                     pixelsRemoved++;
                 }
            }
            console.log('Pixels removed:', pixelsRemoved);
            ctx.putImageData(imageData, 0, 0);
            
            const outUrl = canvas.toDataURL('image/png');
            ipcRenderer.send('done', outUrl);
        };
        img.onerror = (e) => {
            ipcRenderer.send('error', 'Failed to load image');
        };
        img.src = "${dataUrl}";
    </script>
    </body>
    </html>
    `;

    ipcMain.once('done', (event, outUrl) => {
        const base64Data = outUrl.replace(/^data:image\/png;base64,/, "");
        fs.writeFileSync(destPath, base64Data, 'base64');
        console.log('SUCCESS: Icon saved to ' + destPath);
        app.quit();
    });

    ipcMain.once('error', (event, err) => {
        console.error('ERROR:', err);
        app.quit();
    });

    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
});
