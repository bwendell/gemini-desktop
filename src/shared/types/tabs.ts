export const TAB_FRAME_NAME_PREFIX = 'gemini-tab-';

export function getTabFrameName(tabId: string): string {
    return `${TAB_FRAME_NAME_PREFIX}${tabId}`;
}

export interface TabState {
    id: string;
    title: string;
    url: string;
    createdAt: number;
}

export interface TabsState {
    tabs: TabState[];
    activeTabId: string;
}

export interface GeminiNavigatePayload {
    requestId: string;
    targetTabId: string;
    text: string;
}

export interface GeminiReadyPayload {
    requestId: string;
    targetTabId: string;
}

export type TabShortcutCommand = 'new' | 'close' | 'next' | 'previous' | 'jump';

export interface TabShortcutPayload {
    command: TabShortcutCommand;
    index?: number;
}
