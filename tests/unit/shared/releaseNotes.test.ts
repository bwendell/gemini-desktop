import { describe, expect, it } from 'vitest';

import { GITHUB_RELEASES_URL, getReleaseNotesUrl } from '../../../src/shared/utils/releaseNotes';

describe('releaseNotes', () => {
    it('exports releases URL', () => {
        expect(GITHUB_RELEASES_URL).toBe('https://github.com/bwendell/gemini-desktop/releases');
    });

    it('uses latest release when version is undefined', () => {
        expect(getReleaseNotesUrl()).toBe('https://github.com/bwendell/gemini-desktop/releases/latest');
    });

    it('uses latest release when version is empty', () => {
        expect(getReleaseNotesUrl('')).toBe('https://github.com/bwendell/gemini-desktop/releases/latest');
    });

    it('uses latest release when version is whitespace', () => {
        expect(getReleaseNotesUrl('  ')).toBe('https://github.com/bwendell/gemini-desktop/releases/latest');
    });

    it('builds tag URL for version without v', () => {
        expect(getReleaseNotesUrl('1.2.3')).toBe('https://github.com/bwendell/gemini-desktop/releases/tag/v1.2.3');
    });

    it('uses tag URL for version with v', () => {
        expect(getReleaseNotesUrl('v1.2.3')).toBe('https://github.com/bwendell/gemini-desktop/releases/tag/v1.2.3');
    });
});
