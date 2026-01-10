# Response Notifications

## ADDED Requirements

### Requirement: REQ-NOTIF-001 Native OS Notification on Response Completion

The application MUST show a native operating system notification when Gemini finishes generating a response and the main window is not focused.

#### Scenario: User switches to another app while waiting for response

**Given** the user has submitted a prompt to Gemini
**And** the main window is not focused (user switched to another application)
**When** Gemini finishes generating the response
**Then** a native OS notification appears with title "Gemini" and body "Response ready"
**And** clicking the notification focuses the main window

#### Scenario: User stays focused on Gemini window

**Given** the user has submitted a prompt to Gemini
**And** the main window is focused
**When** Gemini finishes generating the response
**Then** no notification is shown

---

### Requirement: REQ-NOTIF-002 Taskbar/Dock Badge on Response Completion

The application MUST show a visual indicator (badge) on the taskbar (Windows) or dock (macOS) when a response completes and the window is unfocused.

#### Scenario: Badge appears on Windows when unfocused

**Given** the main window is not focused
**When** Gemini finishes generating a response
**Then** a green dot overlay appears on the taskbar icon

#### Scenario: Badge appears on macOS when unfocused

**Given** the main window is not focused
**When** Gemini finishes generating a response
**Then** a badge appears on the dock icon

#### Scenario: Badge clears when window is focused

**Given** a response notification badge is visible
**When** the user focuses the main window
**Then** the badge is cleared

---

### Requirement: REQ-NOTIF-003 User Preference for Response Notifications

The application MUST allow users to enable or disable response notifications via a setting. The setting SHOULD be enabled by default.

#### Scenario: Toggle shows current state

**Given** the user opens Options → Settings tab
**Then** a "Response Notifications" toggle is visible
**And** the toggle reflects the current enabled state

#### Scenario: User disables notifications

**Given** the user opens Options → Settings tab
**And** "Response Notifications" is enabled
**When** the user toggles it off
**Then** no further response notifications are shown
**And** no response badges appear

#### Scenario: Setting persists across app restarts

**Given** the user has disabled response notifications
**When** the app is restarted
**Then** the setting remains disabled

---

### Requirement: REQ-NOTIF-004 Cross-Platform Notification Support

The application MUST support notifications on Windows, macOS, and Linux.

#### Scenario: Notifications work on Windows

**Given** the app is running on Windows
**When** a response completes while unfocused
**Then** a Windows toast notification appears
**And** a green taskbar overlay is shown

#### Scenario: Notifications work on macOS

**Given** the app is running on macOS
**When** a response completes while unfocused
**Then** a macOS notification center notification appears
**And** a dock badge is shown

#### Scenario: Notifications work on Linux (GNOME/KDE)

**Given** the app is running on Linux with GNOME or KDE desktop
**When** a response completes while unfocused
**Then** a libnotify notification appears
**And** no badge is shown (not supported on Linux)
