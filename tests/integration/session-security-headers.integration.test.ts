import { expect } from '@wdio/globals';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';

describe('Session Security Headers', () => {
  let server: Server;
  let baseUrl: string;

  before(async () => {
    // Start a local server to serve headers for testing
    // We use this instead of browser.mock because the WDIO Electron service
    // doesn't support Bidi/CDP mocking reliably in all environments.
    await new Promise<void>((resolve) => {
      server = createServer((req, res) => {
        // Add CORS headers so the renderer (file:// or localhost) can fetch
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        };

        if (req.method === 'OPTIONS') {
          res.writeHead(204, corsHeaders);
          res.end();
          return;
        }

        if (req.url === '/headers') {
          res.writeHead(200, {
            ...corsHeaders,
            'X-Frame-Options': 'DENY',
            'Content-Security-Policy':
              "frame-ancestors 'none'; default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http:; connect-src *", // Update CSP to verify logic works even with complex CPS
            'Content-Type': 'text/html',
          });
          res.end('<html>Success</html>');
        } else if (req.url === '/normal') {
          res.writeHead(200, {
            ...corsHeaders,
            'X-Frame-Options': 'DENY',
            'Content-Type': 'text/html',
          });
          res.end('<html>Success</html>');
        } else {
          res.writeHead(404, corsHeaders);
          res.end();
        }
      }).listen(0, '127.0.0.1', () => {
        const port = (server.address() as AddressInfo).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Wait for Electron app to be ready
    await browser.waitUntil(
      async () => {
        try {
          return await browser.execute(() => typeof (window as any).electronAPI !== 'undefined');
        } catch {
          return false;
        }
      },
      { timeout: 30000 }
    );

    // Navigate to a data URL to avoid the application's CSP blocking our local fetch
    await browser.url('data:text/html,<html><body>Integration Test Context</body></html>');
  });

  after(() => {
    server?.close();
  });

  it('should strip X-Frame-Options from allowed domains (localhost)', async () => {
    // Fetch from our local server which is in the allowed list (added in security.ts)
    const headers = await browser.executeAsync(async (url, done) => {
      try {
        const response = await fetch(url);
        const h: Record<string, string> = {};
        response.headers.forEach((v, k) => (h[k.toLowerCase()] = v));
        done(h);
      } catch (e) {
        done({ error: String(e) });
      }
    }, `${baseUrl}/headers`);

    // The header should have been stripped by the main process
    expect(headers).not.toHaveProperty('x-frame-options');
    expect(headers).toHaveProperty('content-type', 'text/html');
  });

  it('should strip frame-ancestors from CSP headers', async () => {
    const headers = await browser.executeAsync(async (url, done) => {
      try {
        const response = await fetch(url);
        const h: Record<string, string> = {};
        response.headers.forEach((v, k) => (h[k.toLowerCase()] = v));
        done(h);
      } catch (e) {
        done({ error: String(e) });
      }
    }, `${baseUrl}/headers`);

    expect(headers).toHaveProperty('content-security-policy');
    const csp = (headers as any)['content-security-policy'];
    // frame-ancestors should be removed
    expect(csp).not.toContain('frame-ancestors');
    // Other directives should remain
    expect(csp).toContain("default-src 'self'");
  });
});
