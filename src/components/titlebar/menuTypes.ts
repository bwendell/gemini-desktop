/**
 * Type definitions for titlebar menus.
 */

export type MenuItem =
    | {
        label: string;
        action?: () => void;
        shortcut?: string;
        disabled?: boolean;
    }
    | { separator: true };

export interface MenuDefinition {
    label: string;
    items: MenuItem[];
}

/**
 * Type guard to check if a menu item is a separator
 */
export function isSeparator(item: MenuItem): item is { separator: true } {
    return 'separator' in item && item.separator === true;
}
