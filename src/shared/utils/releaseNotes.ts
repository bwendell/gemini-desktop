import { GITHUB_REPO_URL } from '../constants';

export const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases` as const;

export function getReleaseNotesUrl(version?: string): string {
    const trimmedVersion = version?.trim();

    if (!trimmedVersion) {
        return `${GITHUB_RELEASES_URL}/latest`;
    }

    if (trimmedVersion.startsWith('v')) {
        return `${GITHUB_RELEASES_URL}/tag/${trimmedVersion}`;
    }

    return `${GITHUB_RELEASES_URL}/tag/v${trimmedVersion}`;
}
