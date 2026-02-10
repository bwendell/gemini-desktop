#!/usr/bin/env node
/**
 * Standalone D-Bus GlobalShortcuts test script v3.
 *
 * Uses low-level bus message handling for proper XDG portal signal handling.
 * This is the correct approach for dbus-next with XDG desktop portals.
 *
 * Usage: node scripts/dbus-hotkey-test.mjs
 */

import dbus from 'dbus-next';

const PORTAL_BUS_NAME = 'org.freedesktop.portal.Desktop';
const PORTAL_OBJECT_PATH = '/org/freedesktop/portal/desktop';
const GLOBAL_SHORTCUTS_INTERFACE = 'org.freedesktop.portal.GlobalShortcuts';

const { Variant, Message } = dbus;

/**
 * Wait for a D-Bus Response signal from the portal.
 * Uses low-level message filtering because request objects are ephemeral.
 */
function waitForResponse(bus, requestPath, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            bus.removeListener('message', handler);
            reject(new Error(`Timeout waiting for Response on ${requestPath} (${timeoutMs}ms)`));
        }, timeoutMs);

        function handler(msg) {
            // Check if this is the Response signal for our request path
            if (
                msg.type === 4 /* SIGNAL */ &&
                msg.path === requestPath &&
                msg.interface === 'org.freedesktop.portal.Request' &&
                msg.member === 'Response'
            ) {
                clearTimeout(timeout);
                bus.removeListener('message', handler);
                const [responseCode, results] = msg.body || [];
                resolve({ responseCode, results });
            }
        }

        bus.on('message', handler);
    });
}

async function main() {
    console.log('=== D-Bus GlobalShortcuts Test v3 (low-level) ===\n');

    // Connect to session bus
    const bus = dbus.sessionBus();

    // Get portal proxy — this also waits for bus name assignment
    const proxyObj = await bus.getProxyObject(PORTAL_BUS_NAME, PORTAL_OBJECT_PATH);
    const portal = proxyObj.getInterface(GLOBAL_SHORTCUTS_INTERFACE);

    const senderName = bus.name;
    const senderClean = senderName?.replace(/^:/, '').replace(/\./g, '_') || '';
    console.log(`Bus: ${senderName} → ${senderClean}`);

    if (!senderClean) {
        console.error('FATAL: bus.name is still null');
        bus.disconnect();
        process.exit(1);
    }

    // ----- Subscribe to Activated signal using BOTH approaches -----

    // Approach 1: High-level proxy interface listener
    portal.on('Activated', (...args) => {
        console.log('\n🎉 [PROXY] Activated:', JSON.stringify(args, null, 2));
    });

    // Approach 2: Low-level bus message listener (more reliable)
    // Add a match rule for the Activated signal
    try {
        await bus.call(
            new Message({
                destination: 'org.freedesktop.DBus',
                path: '/org/freedesktop/DBus',
                interface: 'org.freedesktop.DBus',
                member: 'AddMatch',
                signature: 's',
                body: [`type='signal',interface='${GLOBAL_SHORTCUTS_INTERFACE}',member='Activated'`],
            })
        );
        console.log('AddMatch for Activated signal succeeded');
    } catch (e) {
        console.log('AddMatch failed (may already be subscribed):', e.message);
    }

    bus.on('message', (msg) => {
        if (msg.interface === GLOBAL_SHORTCUTS_INTERFACE && msg.member === 'Activated') {
            console.log('\n🎉 [BUS-LEVEL] Activated signal!');
            console.log('   Path:', msg.path);
            console.log('   Body:', JSON.stringify(msg.body, null, 2));
        }
        if (msg.interface === GLOBAL_SHORTCUTS_INTERFACE && msg.member === 'Deactivated') {
            console.log('\n   [BUS-LEVEL] Deactivated signal');
            console.log('   Body:', JSON.stringify(msg.body, null, 2));
        }
    });

    // ----- CreateSession with proper Response handling -----
    const timestamp = Date.now();
    const handleToken = `test_h_${timestamp}`;
    const sessionHandleToken = `test_s_${timestamp}`;
    const expectedRequestPath = `/org/freedesktop/portal/desktop/request/${senderClean}/${handleToken}`;

    console.log(`\n--- CreateSession ---`);
    console.log(`Request path: ${expectedRequestPath}`);

    // Start listening for Response BEFORE making the call
    const createResponsePromise = waitForResponse(bus, expectedRequestPath, 5000);

    const createResult = await portal.CreateSession({
        handle_token: new Variant('s', handleToken),
        session_handle_token: new Variant('s', sessionHandleToken),
    });
    console.log('CreateSession method returned:', createResult);

    let sessionPath;
    try {
        const response = await createResponsePromise;
        console.log(`CreateSession Response: code=${response.responseCode}`);
        console.log('  Results:', JSON.stringify(response.results, null, 2));

        // Extract session handle from the variant value
        const sessionHandleVariant = response.results?.session_handle;
        const sessionHandleValue = sessionHandleVariant?.value || sessionHandleVariant;
        sessionPath =
            sessionHandleValue || `/org/freedesktop/portal/desktop/session/${senderClean}/${sessionHandleToken}`;
    } catch (err) {
        console.warn(`CreateSession Response error: ${err.message}`);
        sessionPath = `/org/freedesktop/portal/desktop/session/${senderClean}/${sessionHandleToken}`;
    }
    console.log(`Session path: ${sessionPath}`);

    // ----- BindShortcuts -----
    const bindHandleToken = `test_b_${timestamp}`;
    const bindRequestPath = `/org/freedesktop/portal/desktop/request/${senderClean}/${bindHandleToken}`;

    const shortcuts = [
        [
            'test-ctrl-shift-g',
            {
                description: new Variant('s', 'Test Shortcut: Ctrl+Shift+G'),
                preferred_trigger: new Variant('s', 'CTRL+SHIFT+G'),
            },
        ],
    ];

    console.log(`\n--- BindShortcuts ---`);
    console.log(`Request path: ${bindRequestPath}`);
    console.log(
        'Shortcuts:',
        shortcuts.map((s) => ({
            id: s[0],
            desc: s[1].description.value,
            trigger: s[1].preferred_trigger.value,
        }))
    );

    const bindResponsePromise = waitForResponse(bus, bindRequestPath, 5000);

    const bindResult = await portal.BindShortcuts(sessionPath, shortcuts, '', {
        handle_token: new Variant('s', bindHandleToken),
    });
    console.log('BindShortcuts method returned:', bindResult);

    try {
        const bindResponse = await bindResponsePromise;
        console.log(`BindShortcuts Response: code=${bindResponse.responseCode}`);
        console.log('  Results:', JSON.stringify(bindResponse.results, null, 2));

        if (bindResponse.responseCode !== 0) {
            console.log('\n⚠️  BindShortcuts was NOT successful (code != 0)');
            console.log('    This may mean the portal requires user confirmation');
        }
    } catch (err) {
        console.warn(`BindShortcuts Response error: ${err.message}`);
    }

    // ----- ListShortcuts -----
    const listHandleToken = `test_l_${timestamp}`;
    const listRequestPath = `/org/freedesktop/portal/desktop/request/${senderClean}/${listHandleToken}`;

    console.log(`\n--- ListShortcuts ---`);
    const listResponsePromise = waitForResponse(bus, listRequestPath, 5000);

    const listResult = await portal.ListShortcuts(sessionPath, {
        handle_token: new Variant('s', listHandleToken),
    });
    console.log('ListShortcuts method returned:', listResult);

    try {
        const listResponse = await listResponsePromise;
        console.log(`ListShortcuts Response: code=${listResponse.responseCode}`);
        console.log('  Shortcuts:', JSON.stringify(listResponse.results, null, 2));
    } catch (err) {
        console.warn(`ListShortcuts Response error: ${err.message}`);
    }

    // ----- Wait for signals -----
    console.log('\n======================================');
    console.log('🎯 Listening for Activated signals...');
    console.log('Press Ctrl+Shift+G to test');
    console.log('Press Ctrl+C to exit');
    console.log('======================================\n');

    process.on('SIGINT', () => {
        console.log('\nDisconnecting...');
        bus.disconnect();
        process.exit(0);
    });

    setInterval(() => {
        console.log(`  [${new Date().toISOString()}] Still listening...`);
    }, 10000);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
