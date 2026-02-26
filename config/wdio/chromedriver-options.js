export function getChromedriverOptions() {
    const chromedriverPath = process.env.CHROMEDRIVER_PATH;

    return {
        cacheDir: process.env.WEBDRIVER_CACHE_DIR,
        ...(chromedriverPath ? { binary: chromedriverPath } : {}),
    };
}
