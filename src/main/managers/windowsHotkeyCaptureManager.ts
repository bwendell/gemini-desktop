import type { BrowserWindow, Input, Point } from 'electron';

import type HotkeyManager from './hotkeyManager';
import { acceleratorFromKeyInput } from '../../shared/utils/acceleratorUtils';
import type { HotkeyCaptureResult } from '../../shared/types/hotkey-capture';
import { createLogger } from '../utils/logger';

interface CaptureSession {
    token: symbol;
    resolve: (result: HotkeyCaptureResult) => void;
}

interface WindowKeyboardState {
    lastAltSpaceCandidateAt: number;
}

const ALT_SPACE_ACCELERATOR = 'Alt+Space';
const ALT_SPACE_CANDIDATE_WINDOW_MS = 1000;

export class WindowsHotkeyCaptureManager {
    private readonly logger = createLogger('[WindowsHotkeyCaptureManager]');
    private readonly sessions = new Map<number, CaptureSession>();
    private readonly keyboardState = new Map<number, WindowKeyboardState>();
    private readonly attachedWindows = new Set<number>();

    constructor(
        private readonly hotkeyManager: HotkeyManager,
        private readonly platform: NodeJS.Platform = process.platform
    ) {}

    attachWindow(win: BrowserWindow): void {
        if (!this.isEnabled() || this.attachedWindows.has(win.id)) {
            return;
        }

        this.attachedWindows.add(win.id);
        this.keyboardState.set(win.id, { lastAltSpaceCandidateAt: 0 });

        win.webContents.on('before-input-event', (event, input) => {
            this.handleBeforeInputEvent(win.id, event, input as Input);
        });

        win.on('system-context-menu', (event, point) => {
            this.handleSystemContextMenu(win, event, point);
        });

        win.on('closed', () => {
            this.cancelCapture(win.id);
            this.keyboardState.delete(win.id);
            this.attachedWindows.delete(win.id);
        });
    }

    beginCapture(windowId: number): Promise<HotkeyCaptureResult> {
        if (!this.isEnabled()) {
            return Promise.resolve({ status: 'cancelled', accelerator: null });
        }

        this.cancelCapture(windowId);

        return new Promise<HotkeyCaptureResult>((resolve) => {
            this.sessions.set(windowId, {
                token: Symbol(`capture-${windowId}`),
                resolve,
            });
        });
    }

    cancelCapture(windowId: number): void {
        this.finishCapture(windowId, { status: 'cancelled', accelerator: null });
    }

    private isEnabled(): boolean {
        return this.platform === 'win32';
    }

    private handleBeforeInputEvent(windowId: number, event: { preventDefault: () => void }, input: Input): void {
        if (!this.isEnabled() || input.type !== 'keyDown') {
            return;
        }

        if (this.isAltSpaceCandidate(input)) {
            this.keyboardState.set(windowId, { lastAltSpaceCandidateAt: Date.now() });
        }

        const accelerator = acceleratorFromKeyInput({
            ctrlKey: 'control' in input ? Boolean(input.control) : false,
            metaKey: 'meta' in input ? Boolean(input.meta) : false,
            altKey: 'alt' in input ? Boolean(input.alt) : false,
            shiftKey: 'shift' in input ? Boolean(input.shift) : false,
            key: 'key' in input && typeof input.key === 'string' ? input.key : '',
            code: 'code' in input && typeof input.code === 'string' ? input.code : '',
        });

        if (!accelerator) {
            return;
        }

        const captureSession = this.sessions.get(windowId);
        if (!captureSession) {
            return;
        }

        event.preventDefault();
        this.finishCapture(windowId, {
            status: 'captured',
            accelerator,
        });
    }

    private handleSystemContextMenu(win: BrowserWindow, event: { preventDefault: () => void }, point: Point): void {
        if (!this.isEnabled()) {
            return;
        }

        const captureActive = this.sessions.has(win.id);
        const registeredAltSpace = this.hotkeyManager.ownsRegisteredGlobalAccelerator(ALT_SPACE_ACCELERATOR);
        if (!captureActive && !registeredAltSpace) {
            return;
        }

        const position = win.getPosition();
        const keyboardTriggeredAltSpace =
            position.length >= 2 && this.isLikelyKeyboardAltSpace(win.id, point, position);
        if (!keyboardTriggeredAltSpace) {
            return;
        }

        event.preventDefault();

        if (!captureActive) {
            return;
        }

        this.finishCapture(win.id, {
            status: 'captured',
            accelerator: ALT_SPACE_ACCELERATOR,
        });
    }

    private isAltSpaceCandidate(input: Input): boolean {
        return (
            'alt' in input &&
            Boolean(input.alt) &&
            'key' in input &&
            typeof input.key === 'string' &&
            input.key === 'Alt'
        );
    }

    private isLikelyKeyboardAltSpace(windowId: number, point: Point, position: number[]): boolean {
        const state = this.keyboardState.get(windowId);
        if (!state) {
            return false;
        }

        const [windowX, windowY] = position;
        if (windowX === undefined || windowY === undefined) {
            return false;
        }

        const withinRecentKeyboardWindow = Date.now() - state.lastAltSpaceCandidateAt <= ALT_SPACE_CANDIDATE_WINDOW_MS;
        const isWindowCorner = windowX === point.x && windowY === point.y + 1;

        return withinRecentKeyboardWindow && isWindowCorner;
    }

    private finishCapture(windowId: number, result: HotkeyCaptureResult): void {
        const session = this.sessions.get(windowId);
        if (!session) {
            return;
        }

        this.sessions.delete(windowId);
        try {
            session.resolve(result);
        } catch (error) {
            this.logger.error('Failed to resolve hotkey capture session:', error);
        }
    }
}
