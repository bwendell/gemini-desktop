# Design: Response Notifications

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Main Process                            │
│                                                                 │
│  ┌─────────────────┐    ┌────────────────────┐                 │
│  │   MainWindow    │───▶│ ResponseDetector   │                 │
│  │                 │    │ (webRequest hooks) │                 │
│  │  - isFocused()  │    └────────┬───────────┘                 │
│  │  - focus event  │             │                             │
│  │  - blur event   │             │ response-complete event     │
│  └────────┬────────┘             ▼                             │
│           │             ┌────────────────────┐                 │
│           │             │NotificationManager │                 │
│           └────────────▶│                    │                 │
│   focus state updates   │ - showNotification │                 │
│                         │ - showBadge        │                 │
│                         │ - clearBadge       │                 │
│                         │ - focusWindow      │                 │
│                         └────────┬───────────┘                 │
│                                  │                             │
│                    ┌─────────────┴─────────────┐               │
│                    ▼                           ▼               │
│           ┌──────────────┐           ┌──────────────┐          │
│           │ Electron     │           │ BadgeManager │          │
│           │ Notification │           │ (existing)   │          │
│           └──────────────┘           └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Response Detection Deep Dive

### Option Analysis

1. **DOM Mutation Observer** (NOT chosen)
    - Pros: Direct observation of UI changes
    - Cons: Fragile selectors, noisy mutations during streaming, framework coupling

2. **Network Request Monitoring** (CHOSEN)
    - Pros: Stable API endpoints, atomic completion signal, already proven in codebase
    - Cons: Requires understanding Gemini's network protocol

3. **Postmessage from injected script** (Considered)
    - Pros: Could access internal Angular state
    - Cons: Same fragility as DOM, added complexity

### Implementation Details

Gemini uses a streaming response mechanism. We'll monitor for the completion of streaming:

```typescript
// In mainWindow.ts or dedicated responseDetector.ts
session.defaultSession.webRequest.onCompleted({ urls: ['*://gemini.google.com/*/BardChatUi/*'] }, (details) => {
    // Check for successful completion of chat request
    if (details.statusCode === 200 && this.isStreamingResponse(details)) {
        this.emit('response-complete');
    }
});
```

Alternatively, we can monitor `onBeforeRequest` to track when a request starts and `onCompleted`/`onErrorOccurred` to know when it finishes, allowing us to only notify after user-initiated requests.

## NotificationManager Design

```typescript
class NotificationManager {
    private isWindowFocused: boolean = true;
    private hasPendingNotification: boolean = false;

    constructor(
        private readonly mainWindow: MainWindow,
        private readonly badgeManager: BadgeManager,
        private readonly store: SettingsStore
    ) {
        // Track window focus
        mainWindow.on('focus', () => this.onWindowFocus());
        mainWindow.on('blur', () => this.onWindowBlur());

        // Listen for response completion
        mainWindow.on('response-complete', () => this.onResponseComplete());
    }

    private onWindowFocus(): void {
        this.isWindowFocused = true;
        if (this.hasPendingNotification) {
            this.badgeManager.clearNotificationBadge();
            this.hasPendingNotification = false;
        }
    }

    private onWindowBlur(): void {
        this.isWindowFocused = false;
    }

    private onResponseComplete(): void {
        if (!this.isEnabled() || this.isWindowFocused) {
            return;
        }

        this.showNativeNotification();
        this.badgeManager.showNotificationBadge();
        this.hasPendingNotification = true;
    }

    private showNativeNotification(): void {
        const notification = new Notification({
            title: 'Gemini',
            body: 'Response ready',
            silent: false,
        });

        notification.on('click', () => {
            this.mainWindow.focus();
        });

        notification.show();
    }
}
```

## BadgeManager Extensions

The existing `BadgeManager` currently supports:

- `showUpdateBadge()` / `clearUpdateBadge()` - For update notifications

We'll extend to support response notifications:

- `showNotificationBadge()` / `clearNotificationBadge()` - For response notifications

These can share the same visual indicator (green dot) or use different icons. Initially, we'll reuse the existing green dot for simplicity.

## Settings Integration

New settings in `store.ts`:

```typescript
responseNotificationsEnabled: true; // Default enabled per user requirement
```

## IPC Channels

```typescript
// New channels
RESPONSE_NOTIFICATIONS_GET_ENABLED = 'response-notifications:get-enabled';
RESPONSE_NOTIFICATIONS_SET_ENABLED = 'response-notifications:set-enabled';
```

## Edge Cases

1. **Rapid responses**: Debounce notifications to avoid spam (e.g., 1s cooldown)
2. **Window hidden vs unfocused**: Hidden (to tray) should still trigger notifications
3. **Quick Chat responses**: Initial scope targets main window only
4. **Multiple conversations**: Single notification for any response completion
5. **User rapidly switching back**: Don't notify if window was focused within last 100ms

## Testing Strategy

- **Unit tests**: NotificationManager logic, focus state tracking
- **Coordinated tests**: IPC handler + settings persistence
- **Integration tests**: Full flow from response detection to notification
- **E2E tests**: Verify notification appears (platform-specific verification)

Note: E2E testing of native notifications is challenging. We'll verify:

1. The notification was created (mock Notification constructor)
2. The badge was shown (verify via BadgeManager state)
3. Click behavior focuses window (verify window.isFocused())
