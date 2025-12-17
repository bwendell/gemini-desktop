import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usesCustomWindowControls } from '../../utils';
import type { MenuDefinition } from './menuTypes';
import { isSeparator } from './menuTypes';

interface TitlebarMenuProps {
    menus: MenuDefinition[];
}

/**
 * VS Code-style menu bar for the titlebar.
 * Uses custom HTML/CSS dropdowns for a consistent cross-platform appearance.
 * Native menus are only used on macOS (handled by system).
 */
export function TitlebarMenu({ menus }: TitlebarMenuProps) {
    const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const menuBarRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

    // On macOS, we use native menus, so don't render this component
    if (!usesCustomWindowControls()) {
        return null;
    }

    // Handle Escape key to close menu
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (activeMenuIndex !== null && event.key === 'Escape') {
                setActiveMenuIndex(null);
            }
        };

        if (activeMenuIndex !== null) {
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
        return undefined;
    }, [activeMenuIndex]);

    // Handle clicks outside both the menu bar AND the dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            // Check if click is inside menu bar
            const isInsideMenuBar = menuBarRef.current?.contains(target);
            // Check if click is inside dropdown (which is in a Portal)
            const isInsideDropdown = dropdownRef.current?.contains(target);

            if (!isInsideMenuBar && !isInsideDropdown) {
                setActiveMenuIndex(null);
            }
        };

        if (activeMenuIndex !== null) {
            // Use setTimeout to avoid the click that opened the menu from immediately closing it
            const timeoutId = setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 0);

            return () => {
                clearTimeout(timeoutId);
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
        return undefined;
    }, [activeMenuIndex]);

    const openMenu = useCallback((index: number) => {
        const button = buttonRefs.current[index];
        /* c8 ignore next 5 -- defensive null check, refs always populated */
        if (button) {
            const rect = button.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom,
                left: rect.left,
            });
        }
        setActiveMenuIndex(index);
    }, []);

    const handleMenuClick = useCallback((index: number) => {
        if (activeMenuIndex === index) {
            setActiveMenuIndex(null);
        } else {
            openMenu(index);
        }
    }, [activeMenuIndex, openMenu]);

    const handleMouseEnter = useCallback((index: number) => {
        // Only switch on hover if a menu is already open
        if (activeMenuIndex !== null && activeMenuIndex !== index) {
            openMenu(index);
        }
    }, [activeMenuIndex, openMenu]);

    const handleItemClick = useCallback((action?: () => void) => {
        setActiveMenuIndex(null);
        if (action) {
            action();
        }
    }, []);

    // Render dropdown for the active menu
    const renderDropdown = () => {
        if (activeMenuIndex === null) return null;

        const menu = menus[activeMenuIndex];
        // Guard against undefined menu (TypeScript noUncheckedIndexedAccess)
        if (!menu) return null;

        const dropdown = (
            <>
                {/* Backdrop to capture clicks outside the menu (over webview/iframe) */}
                <div
                    className="titlebar-menu-backdrop"
                    style={{ top: `${dropdownPosition.top}px` }} // Start from bottom of titlebar
                    onClick={() => setActiveMenuIndex(null)}
                />
                <div
                    ref={dropdownRef}
                    className="titlebar-menu-dropdown"
                    style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                        zIndex: 2147483647 // Max z-index
                    }}
                >
                    {menu.items.map((item, itemIndex) => {
                        if (isSeparator(item)) {
                            return <div key={itemIndex} className="titlebar-menu-separator" />;
                        }

                        return (
                            <button
                                key={item.label}
                                className="titlebar-menu-item"
                                disabled={item.disabled}
                                onClick={() => handleItemClick(item.action)}
                                data-testid={`menu-item-${item.label}`}
                            >
                                <span className="menu-item-label">{item.label}</span>
                                {item.shortcut && (
                                    <span className="menu-item-shortcut">{item.shortcut}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </>
        );

        // Render dropdown as a portal to escape overflow:hidden containers
        return createPortal(dropdown, document.body);
    };

    return (
        <>
            <div className="titlebar-menu-bar" ref={menuBarRef} data-testid="titlebar-menu-bar">
                {menus.map((menu, index) => (
                    <div key={menu.label} className="titlebar-menu-wrapper">
                        <button
                            ref={(el) => { buttonRefs.current[index] = el; }}
                            className={`titlebar-menu-button ${activeMenuIndex === index ? 'active' : ''}`}
                            onClick={() => handleMenuClick(index)}
                            onMouseEnter={() => handleMouseEnter(index)}
                            aria-expanded={activeMenuIndex === index}
                            data-testid={`menu-button-${menu.label}`}
                        >
                            {menu.label}
                        </button>
                    </div>
                ))}
            </div>
            {renderDropdown()}
        </>
    );
}
