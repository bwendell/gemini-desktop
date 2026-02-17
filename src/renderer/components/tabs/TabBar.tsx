import React, { useCallback, type MouseEvent } from 'react';

import type { TabState } from '../../../shared/types/tabs';
import { TAB_TEST_IDS } from '../../utils/testIds';
import { Tab } from './Tab';
import './TabBar.css';

interface TabBarProps {
    tabs: TabState[];
    activeTabId: string;
    onTabClick: (id: string) => void;
    onTabClose: (id: string) => void;
    onNewTab: () => void;
    isAtTabLimit?: boolean;
    maxTabs?: number;
}

export const TabBar = React.memo(function TabBar({
    tabs,
    activeTabId,
    onTabClick,
    onTabClose,
    onNewTab,
    isAtTabLimit = false,
    maxTabs,
}: TabBarProps) {
    const handleTabMouseDown = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        if (event.button === 1) {
            event.preventDefault();
        }
    }, []);

    const newTabTitle = isAtTabLimit && maxTabs ? `Maximum ${maxTabs} tabs reached` : 'New tab';

    return (
        <div className="tab-bar" data-testid={TAB_TEST_IDS.TAB_BAR}>
            <div className="tab-bar__tabs">
                {tabs.map((tab) => (
                    <Tab
                        key={tab.id}
                        tab={tab}
                        isActive={tab.id === activeTabId}
                        onClick={() => onTabClick(tab.id)}
                        onClose={() => onTabClose(tab.id)}
                        onMouseDown={handleTabMouseDown}
                    />
                ))}
            </div>
            <button
                type="button"
                className="tab-bar__new"
                onClick={onNewTab}
                data-testid={TAB_TEST_IDS.TAB_NEW_BUTTON}
                aria-label={newTabTitle}
                title={newTabTitle}
                disabled={isAtTabLimit}
            >
                +
            </button>
        </div>
    );
});
