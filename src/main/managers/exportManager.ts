import { app, dialog, BrowserWindow, WebContents } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createLogger } from '../utils/logger';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import { CHAT_EXTRACTION_SCRIPT } from '../utils/chatExtraction';
import PDFDocument from 'pdfkit';
import TurndownService from 'turndown';
// @ts-ignore
import { gfm } from 'turndown-plugin-gfm';

const logger = createLogger('[ExportManager]');

interface ChatTurn {
    role: 'user' | 'model';
    text: string;
    html?: string;
}

interface ChatData {
    title: string;
    timestamp: string;
    conversation: ChatTurn[];
}

export default class ExportManager {
    private turndown: TurndownService;

    constructor() {
        this.turndown = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
        });
        this.turndown.use(gfm);
    }

    /**
     * Extracts chat data from the provided WebContents.
     */
    private async extractChatData(webContents: WebContents): Promise<ChatData | null> {
        try {
            // Find the Gemini frame
            const mainFrameUrl = webContents.getURL();
            let targetFrame: Electron.WebFrameMain | null = null;

            if (mainFrameUrl.includes('gemini.google.com') || mainFrameUrl.includes('aistudio.google.com')) {
                targetFrame = webContents.mainFrame;
            } else {
                const frames = webContents.mainFrame.frames;
                logger.debug(
                    'Available frames:',
                    frames.map((f) => f.url)
                );
                const geminiFrame = frames.find(
                    (frame) => frame.url.includes('gemini.google.com') || frame.url.includes('aistudio.google.com')
                );
                if (geminiFrame) targetFrame = geminiFrame;
            }

            if (!targetFrame) {
                logger.error('Gemini frame not found for extraction');
                return null;
            }

            const data = (await targetFrame.executeJavaScript(CHAT_EXTRACTION_SCRIPT)) as any;
            logger.debug('Extracted data:', JSON.stringify(data, null, 2));

            if (data && data.error) {
                logger.error('Extraction script returned error:', data.error);
                return null;
            }

            if (data && data.conversation && data.conversation.length === 0) {
                logger.warn(
                    'Extraction successful but conversation is empty. Diagnostics:',
                    JSON.stringify(data.diagnostics, null, 2)
                );
            }

            return data as ChatData;
        } catch (error) {
            logger.error('Failed to extract chat data:', error);
            return null;
        }
    }

    /**
     * Exports chat to Markdown.
     */
    async exportToMarkdown(webContents: WebContents): Promise<void> {
        const data = await this.extractChatData(webContents);
        if (!data) {
            webContents.send(IPC_CHANNELS.TOAST_SHOW, { message: 'Failed to extract chat data', type: 'error' });
            return;
        }

        let markdown = `# ${data.title}\n\n*Exported on ${new Date(data.timestamp).toLocaleString()}*\n\n---\n\n`;

        for (const turn of data.conversation) {
            const role = turn.role === 'user' ? '## You' : '## Gemini';
            const content = turn.html ? this.turndown.turndown(turn.html) : turn.text;
            markdown += `${role}\n\n${content}\n\n---\n\n`;
        }

        const { filePath, canceled } = await dialog.showSaveDialog({
            title: 'Save Chat as Markdown',
            defaultPath: path.join(app.getPath('downloads'), `${data.title.replace(/[/\\?%*:|"<>]/g, '-')}.md`),
            filters: [{ name: 'Markdown Files', extensions: ['md'] }],
        });

        if (canceled || !filePath) return;

        await fs.writeFile(filePath, markdown);
        webContents.send(IPC_CHANNELS.TOAST_SHOW, { message: 'Chat exported to Markdown', type: 'success' });
    }

    /**
     * Exports chat to PDF (Vector-based with selectable text).
     */
    async exportToPdf(webContents: WebContents): Promise<void> {
        const data = await this.extractChatData(webContents);
        if (!data) {
            webContents.send(IPC_CHANNELS.TOAST_SHOW, { message: 'Failed to extract chat data', type: 'error' });
            return;
        }

        const { filePath, canceled } = await dialog.showSaveDialog({
            title: 'Save Chat as PDF',
            defaultPath: path.join(app.getPath('downloads'), `${data.title.replace(/[/\\?%*:|"<>]/g, '-')}.pdf`),
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
        });

        if (canceled || !filePath) return;

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const stream = require('fs').createWriteStream(filePath);
            doc.pipe(stream);

            // Title
            doc.fontSize(20).text(data.title, { align: 'center' });
            doc.fontSize(10).text(`Exported on ${new Date(data.timestamp).toLocaleString()}`, { align: 'center' });
            doc.moveDown(2);

            for (const turn of data.conversation) {
                doc.fontSize(14)
                    .fillColor(turn.role === 'user' ? '#1a73e8' : '#1e1e1e')
                    .text(turn.role === 'user' ? 'You' : 'Gemini', { underline: true });
                doc.moveDown(0.5);

                const content = turn.html ? this.turndown.turndown(turn.html) : turn.text;
                doc.fontSize(11).fillColor('#333').text(content);
                doc.moveDown(1.5);
                doc.strokeColor('#eee').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
                doc.moveDown(1.5);
            }

            doc.end();
            stream.on('finish', () => {
                webContents.send(IPC_CHANNELS.TOAST_SHOW, { message: 'Chat exported to PDF', type: 'success' });
                resolve();
            });
            stream.on('error', (err: any) => reject(err));
        });
    }
}
