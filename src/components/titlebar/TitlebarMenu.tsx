import { Menu, MenuItem as TauriMenuItem, PredefinedMenuItem } from '@tauri-apps/api/menu';
import { usesCustomWindowControls } from '../../utils';
import type { MenuDefinition } from './menuTypes';
import { isSeparator } from './menuTypes';

interface TitlebarMenuProps {
    menus: MenuDefinition[];
}

/**
 * VS Code-style menu bar for the titlebar.
 * Uses native popup menus to avoid z-order issues with the child webview.
 * Only rendered on Windows/Linux; macOS uses native menus.
 */
export function TitlebarMenu({ menus }: TitlebarMenuProps) {
    // On macOS, we use native menus, so don't render this component
    if (!usesCustomWindowControls()) {
        return null;
    }

    const handleMenuClick = async (menuDef: MenuDefinition) => {
        try {
            // Build menu items
            const items = await Promise.all(
                menuDef.items.map(async (item) => {
                    if (isSeparator(item)) {
                        return await PredefinedMenuItem.new({ item: 'Separator' });
                    }

                    return await TauriMenuItem.new({
                        text: item.label + (item.shortcut ? `\t${item.shortcut}` : ''),
                        enabled: !item.disabled,
                        action: item.action,
                    });
                })
            );

            // Create and popup the menu
            const menu = await Menu.new({ items });
            await menu.popup();
        } catch (error) {
            console.error('Failed to show menu:', error);
        }
    };

    return (
        <div className="titlebar-menu-bar">
            {menus.map((menu) => (
                <button
                    key={menu.label}
                    className="titlebar-menu-button"
                    onClick={() => handleMenuClick(menu)}
                >
                    {menu.label}
                </button>
            ))}
        </div>
    );
}
