import type { MouseEvent } from 'react';

import type { TabState } from '../../../shared/types/tabs';
import { TAB_TEST_IDS } from '../../utils/testIds';

interface TabProps {
    tab: TabState;
    isActive: boolean;
    onClick: () => void;
    onClose: () => void;
    onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function Tab({ tab, isActive, onClick, onClose, onMouseDown }: TabProps) {
    const handleTriggerMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
        onMouseDown(event);
        if (event.button === 1) {
            event.preventDefault();
            onClose();
        }
    };

    const handleCloseClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onClose();
    };

    return (
        <div className={`tab${isActive ? ' tab--active' : ''}`}>
            <button
                type="button"
                className="tab__trigger"
                onClick={onClick}
                onMouseDown={handleTriggerMouseDown}
                data-testid={TAB_TEST_IDS.tab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
            >
                <span className="tab__title">{tab.title}</span>
            </button>
            <button
                type="button"
                className="tab__close"
                onClick={handleCloseClick}
                data-testid={TAB_TEST_IDS.tabClose(tab.id)}
                aria-label={`Close ${tab.title}`}
            >
                x
            </button>
        </div>
    );
}
