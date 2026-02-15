/* @vitest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

import { Tab } from '../../../../../src/renderer/components/tabs/Tab';

describe('Tab', () => {
    afterEach(() => {
        cleanup();
    });

    const baseTab = {
        id: 'tab-1',
        title: 'My Chat',
        url: 'https://gemini.google.com/app',
        createdAt: 1,
    };

    it('renders title and active style', () => {
        render(<Tab tab={baseTab} isActive onClick={vi.fn()} onClose={vi.fn()} onMouseDown={vi.fn()} />);

        expect(screen.queryByText('My Chat')).not.toBeNull();
        expect(screen.getByTestId('tab-tab-1').getAttribute('aria-current')).toBe('page');
        expect(screen.getByTestId('tab-tab-1').parentElement?.className.includes('tab--active')).toBe(true);
    });

    it('does not set aria-current when inactive', () => {
        render(<Tab tab={baseTab} isActive={false} onClick={vi.fn()} onClose={vi.fn()} onMouseDown={vi.fn()} />);

        expect(screen.getByTestId('tab-tab-1').hasAttribute('aria-current')).toBe(false);
    });

    it('calls onClick from trigger click', () => {
        const onClick = vi.fn();
        render(<Tab tab={baseTab} isActive={false} onClick={onClick} onClose={vi.fn()} onMouseDown={vi.fn()} />);

        fireEvent.click(screen.getByTestId('tab-tab-1'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClose from close button click without bubbling to onClick', () => {
        const onClick = vi.fn();
        const onClose = vi.fn();

        render(<Tab tab={baseTab} isActive={false} onClick={onClick} onClose={onClose} onMouseDown={vi.fn()} />);

        fireEvent.click(screen.getByTestId('tab-close-tab-1'));
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onClick).not.toHaveBeenCalled();
    });

    it('closes on middle click and forwards mouse down callback', () => {
        const onClose = vi.fn();
        const onMouseDown = vi.fn();

        render(<Tab tab={baseTab} isActive={false} onClick={vi.fn()} onClose={onClose} onMouseDown={onMouseDown} />);

        fireEvent.mouseDown(screen.getByTestId('tab-tab-1'), { button: 1 });
        expect(onMouseDown).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close on non-middle mouse down', () => {
        const onClose = vi.fn();

        render(<Tab tab={baseTab} isActive={false} onClick={vi.fn()} onClose={onClose} onMouseDown={vi.fn()} />);

        fireEvent.mouseDown(screen.getByTestId('tab-tab-1'), { button: 2 });
        expect(onClose).not.toHaveBeenCalled();
    });
});
