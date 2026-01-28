import { app, dialog, BrowserWindow, WebContents } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createLogger } from '../utils/logger';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import { CHAT_EXTRACTION_SCRIPT } from '../utils/chatExtraction';
import TurndownService from 'turndown';
// @ts-ignore
import { gfm } from 'turndown-plugin-gfm';
import { marked } from 'marked';

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
     * Allowed domains for Gemini content extraction.
     * The hostname must match exactly or be a subdomain of these.
     */
    private static readonly ALLOWED_DOMAINS = ['gemini.google.com', 'aistudio.google.com'] as const;

    /**
     * Checks if a hostname matches an allowed domain exactly or is a subdomain.
     * Uses domain part comparison to prevent substring bypass attacks.
     */
    private isHostnameAllowed(hostname: string): boolean {
        const hostParts = hostname.toLowerCase().split('.');
        for (const domain of ExportManager.ALLOWED_DOMAINS) {
            const domainParts = domain.split('.');
            // Check if hostname has enough parts and the rightmost parts match exactly
            if (hostParts.length >= domainParts.length) {
                const hostSuffix = hostParts.slice(-domainParts.length);
                if (hostSuffix.every((part, i) => part === domainParts[i])) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Checks if a URL is from an allowed Gemini domain.
     * Uses proper URL parsing to prevent bypass attacks.
     */
    private isAllowedGeminiUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url);
            return this.isHostnameAllowed(parsedUrl.hostname);
        } catch {
            return false;
        }
    }

    /**
     * Extracts chat data from the provided WebContents.
     */
    private async extractChatData(webContents: WebContents): Promise<ChatData | null> {
        try {
            // Find the Gemini frame
            const mainFrameUrl = webContents.getURL();
            let targetFrame: Electron.WebFrameMain | null = null;

            if (this.isAllowedGeminiUrl(mainFrameUrl)) {
                targetFrame = webContents.mainFrame;
            } else {
                const frames = webContents.mainFrame.frames;
                logger.debug(
                    'Available frames:',
                    frames.map((f) => f.url)
                );
                const geminiFrame = frames.find((frame) => this.isAllowedGeminiUrl(frame.url));
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
     * Exports chat to PDF (High-fidelity rendered HTML).
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

        try {
            const htmlContent = this.generatePdfHtml(data);
            const pdfBuffer = await this.renderHtmlToPdf(htmlContent);
            await fs.writeFile(filePath, pdfBuffer);
            webContents.send(IPC_CHANNELS.TOAST_SHOW, { message: 'Chat exported to PDF', type: 'success' });
        } catch (error) {
            logger.error('Failed to generate PDF:', error);
            webContents.send(IPC_CHANNELS.TOAST_SHOW, { message: 'Failed to generate PDF', type: 'error' });
        }
    }

    /**
     * Generates a professionally styled HTML document for the PDF.
     */
    private generatePdfHtml(data: ChatData): string {
        const turnsHtml = data.conversation
            .map((turn) => {
                const roleLabel = turn.role === 'user' ? 'You' : 'Gemini';
                const roleClass = turn.role === 'user' ? 'user-role' : 'model-role';
                // Use the extracted HTML if available, otherwise convert Markdown to HTML
                const contentHtml = turn.html || marked.parse(turn.text);

                return `
                <div class="chat-turn">
                    <div class="role-header ${roleClass}">${roleLabel}</div>
                    <div class="content">${contentHtml}</div>
                </div>
            `;
            })
            .join('');

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 40px;
                    background: #fff;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px solid #eee;
                    margin-bottom: 40px;
                    padding-bottom: 20px;
                }
                .title {
                    font-size: 28px;
                    font-weight: bold;
                    margin: 0;
                    color: #1a1a1b;
                }
                .timestamp {
                    font-size: 14px;
                    color: #666;
                    margin-top: 8px;
                }
                .chat-turn {
                    margin-bottom: 40px;
                    page-break-inside: avoid;
                }
                .role-header {
                    font-size: 18px;
                    font-weight: 600;
                    margin-bottom: 12px;
                    padding-bottom: 4px;
                    border-bottom: 1px solid #f0f0f0;
                }
                .user-role { color: #1a73e8; }
                .model-role { color: #1e1e1e; }
                .content {
                    font-size: 15px;
                    overflow-wrap: break-word;
                }
                pre {
                    background: #f6f8fa;
                    padding: 16px;
                    border-radius: 8px;
                    overflow-x: auto;
                    font-family: inherit;
                    border: 1px solid #e1e4e8;
                }
                code {
                    font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
                    font-size: 85%;
                    background: rgba(175, 184, 193, 0.2);
                    padding: 0.2em 0.4em;
                    border-radius: 6px;
                }
                pre code {
                    background: none;
                    padding: 0;
                    font-size: 13px;
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 16px 0;
                }
                th, td {
                    border: 1px solid #dfe2e5;
                    padding: 8px 12px;
                    text-align: left;
                }
                th { background-color: #f6f8fa; }
                tr:nth-child(even) { background-color: #fafbfc; }
                blockquote {
                    margin: 0 0 16px;
                    padding: 0 1em;
                    color: #6a737d;
                    border-left: 0.25em solid #dfe2e5;
                }
                img { max-width: 100%; }
                @media print {
                    body { padding: 0; }
                    .chat-turn { page-break-inside: avoid; border-bottom: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 class="title">${data.title}</h1>
                <div class="timestamp">Exported on ${new Date(data.timestamp).toLocaleString()}</div>
            </div>
            <div class="conversation">
                ${turnsHtml}
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Renders HTML content to a PDF buffer using a hidden BrowserWindow.
     */
    private async renderHtmlToPdf(html: string): Promise<Buffer> {
        const win = new BrowserWindow({
            show: false,
            webPreferences: {
                offscreen: true,
            },
        });

        try {
            await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
            const data = await win.webContents.printToPDF({
                printBackground: true,
                margins: {
                    top: 1,
                    bottom: 1,
                    left: 1,
                    right: 1,
                },
                pageSize: 'A4',
            });
            return Buffer.from(data);
        } finally {
            win.destroy();
        }
    }
}
