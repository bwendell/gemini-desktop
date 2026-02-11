export function logSkipReason(scope: string, reason: string): void {
    console.log(`[SKIP] ${scope}: ${reason}`);
}

export function skipTest(context: Mocha.Context, scope: string, reason: string): void {
    logSkipReason(scope, reason);
    context.skip();
}

export function skipSuite(context: Mocha.Context, scope: string, reason: string): void {
    logSkipReason(scope, reason);
    context.skip();
}
