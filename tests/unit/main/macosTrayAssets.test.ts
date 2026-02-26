import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

type PngHeader = {
    width: number;
    height: number;
    colorType: number;
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const readPngHeader = (filePath: string): PngHeader => {
    const data = fs.readFileSync(filePath);
    expect(data.subarray(0, 8)).toEqual(PNG_SIGNATURE);

    const ihdrIndex = data.indexOf('IHDR');
    expect(ihdrIndex).toBeGreaterThan(0);

    const width = data.readUInt32BE(ihdrIndex + 4);
    const height = data.readUInt32BE(ihdrIndex + 8);
    const colorType = data.readUInt8(ihdrIndex + 13);

    return { width, height, colorType };
};

describe('macOS tray template assets', () => {
    const buildDir = path.resolve(__dirname, '../../..', 'build');
    const icon1x = path.join(buildDir, 'icon-mac-trayTemplate.png');
    const icon2x = path.join(buildDir, 'icon-mac-trayTemplate@2x.png');

    it('includes template assets with correct filenames', () => {
        expect(path.basename(icon1x)).toBe('icon-mac-trayTemplate.png');
        expect(path.basename(icon2x)).toBe('icon-mac-trayTemplate@2x.png');
    });

    it('ensures template assets exist', () => {
        expect(fs.existsSync(icon1x)).toBe(true);
        expect(fs.existsSync(icon2x)).toBe(true);
    });

    it('ensures template assets have expected dimensions', () => {
        const icon1xHeader = readPngHeader(icon1x);
        const icon2xHeader = readPngHeader(icon2x);

        expect(icon1xHeader.width).toBe(16);
        expect(icon1xHeader.height).toBe(16);
        expect(icon2xHeader.width).toBe(32);
        expect(icon2xHeader.height).toBe(32);
    });

    it('ensures template assets use grayscale or grayscale+alpha color types', () => {
        const icon1xHeader = readPngHeader(icon1x);
        const icon2xHeader = readPngHeader(icon2x);

        const allowedColorTypes = new Set([0, 4]);
        expect(allowedColorTypes.has(icon1xHeader.colorType)).toBe(true);
        expect(allowedColorTypes.has(icon2xHeader.colorType)).toBe(true);
    });
});
