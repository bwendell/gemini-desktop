/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TabBar } from '../../../../../src/renderer/components/tabs/TabBar';

describe('TabBar', () => {
    afterEach(() => {
        cleanup();
    });

    const tabs = [
        { id: 'tab-1', title: 'First', url: 'https://gemini.google.com/app', createdAt: 1 },
        { id: 'tab-2', title: 'Second', url: 'https://gemini.google.com/app', createdAt: 2 },
        { id: 'tab-3', title: 'Third', url: 'https://gemini.google.com/app', createdAt: 3 },
    ];

    it('renders tab bar, tabs, and new tab button', () => {
        render(<TabBar tabs={tabs} activeTabId="tab-1" onTabClick={vi.fn()} onTabClose={vi.fn()} onNewTab={vi.fn()} />);

        expect(screen.queryByTestId('tab-bar')).not.toBeNull();
        expect(screen.queryByTestId('tab-tab-1')).not.toBeNull();
        expect(screen.queryByTestId('tab-tab-2')).not.toBeNull();
        expect(screen.queryByTestId('tab-tab-3')).not.toBeNull();
        expect(screen.queryByTestId('tab-new-button')).not.toBeNull();
    });

    it('fires handlers for tab click, close click, and new tab click', () => {
        const onTabClick = vi.fn();
        const onTabClose = vi.fn();
        const onNewTab = vi.fn();

        render(
            <TabBar
                tabs={tabs}
                activeTabId="tab-1"
                onTabClick={onTabClick}
                onTabClose={onTabClose}
                onNewTab={onNewTab}
            />
        );

        fireEvent.click(screen.getByTestId('tab-tab-2'));
        fireEvent.click(screen.getByTestId('tab-close-tab-3'));
        fireEvent.click(screen.getByTestId('tab-new-button'));

        expect(onTabClick).toHaveBeenCalledWith('tab-2');
        expect(onTabClose).toHaveBeenCalledWith('tab-3');
        expect(onNewTab).toHaveBeenCalledTimes(1);
    });

    it('marks only active tab as active', () => {
        render(<TabBar tabs={tabs} activeTabId="tab-2" onTabClick={vi.fn()} onTabClose={vi.fn()} onNewTab={vi.fn()} />);

        expect(screen.getByTestId('tab-tab-2').parentElement?.classList.contains('tab--active')).toBe(true);
        expect(screen.getByTestId('tab-tab-1').parentElement?.classList.contains('tab--active')).toBe(false);
    });

    it('disables new tab button at limit and sets title', () => {
        render(
            <TabBar
                tabs={[tabs[0]]}
                activeTabId="tab-1"
                onTabClick={vi.fn()}
                onTabClose={vi.fn()}
                onNewTab={vi.fn()}
                isAtTabLimit
                maxTabs={20}
            />
        );

        const newButton = screen.getByTestId('tab-new-button');
        expect((newButton as HTMLButtonElement).disabled).toBe(true);
        expect(newButton.getAttribute('title')).toBe('Maximum 20 tabs reached');
    });
});
