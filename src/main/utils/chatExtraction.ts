import { GEMINI_CONVERSATION_TITLE_SELECTORS } from './geminiSelectors';

const TITLE_SELECTORS_JSON = JSON.stringify(GEMINI_CONVERSATION_TITLE_SELECTORS);

export const CHAT_EXTRACTION_SCRIPT = `
(() => {
    try {
        const selectors = {
            turns: ['chat-turn', 'conversation-turn', '.conversation-container', '.conversation-turn'],
            userQuery: ['.user-query', '.user-prompt-container', 'user-query'],
            userQueryText: ['.query-text', '.user-prompt-container', '.query-text-line'],
            modelResponse: ['.model-response', 'model-response', '.markdown'],
            modelResponseContent: ['.message-content', '.markdown', '.model-response-text'],
            title: ${TITLE_SELECTORS_JSON},
            codeBlocks: 'pre',
            tables: 'table'
        };

        const findElements = (selList) => {
            for (const sel of selList) {
                const els = document.querySelectorAll(sel);
                if (els && els.length > 0) return { elements: els, selector: sel };
            }
            return { elements: [], selector: null };
        };

        const findFirstElement = (selList) => {
            for (const sel of selList) {
                const el = document.querySelector(sel);
                if (el) return el;
            }
            return null;
        };

        const { elements: turns, selector: turnSelector } = findElements(selectors.turns);
        console.log('[Extraction] Found turns:', turns.length, 'using selector:', turnSelector);
        
        const conversation = [];

        turns.forEach((turn, index) => {
            let userText = '';
            let modelText = '';
            let modelHtml = '';

            for (const sel of selectors.userQuery) {
                const el = turn.querySelector(sel);
                if (el) {
                    // Try to find the specific text container
                    let textEl = null;
                    for (const textSel of selectors.userQueryText) {
                        textEl = el.querySelector(textSel);
                        if (textEl) break;
                    }
                    userText = (textEl || el).innerText.trim();
                    if (userText) break;
                }
            }

            for (const sel of selectors.modelResponse) {
                const el = turn.querySelector(sel);
                if (el) {
                    let textEl = null;
                    for (const textSel of selectors.modelResponseContent) {
                        textEl = el.querySelector(textSel);
                        if (textEl) break;
                    }
                    const target = textEl || el;
                    modelText = target.innerText.trim();
                    modelHtml = target.innerHTML;
                    if (modelText) break;
                }
            }

            if (userText) conversation.push({ role: 'user', text: userText });
            if (modelText) conversation.push({ role: 'model', text: modelText, html: modelHtml });
        });

        console.log('[Extraction] Final conversation turns captured:', conversation.length);

        // Try to find the conversation title from the DOM first
        const titleEl = findFirstElement(selectors.title);
        let extractedTitle = titleEl ? titleEl.innerText.trim() : '';
        
        // Fallback to document title if DOM element not found or empty
        if (!extractedTitle) {
            extractedTitle = document.title.replace(' - Gemini', '').trim();
        }

        return {
            title: extractedTitle || 'Untitled Conversation',
            timestamp: new Date().toISOString(),
            conversation,
            diagnostics: {
                turnSelector,
                totalTurns: turns.length,
                capturedTurns: conversation.length,
                url: window.location.href,
                titleSelector: titleEl ? selectors.title.find(s => document.querySelector(s) === titleEl) : null
            }
        };
    } catch (err) {
        console.error('[Extraction Error]', err);
        return {
            title: 'Error',
            timestamp: new Date().toISOString(),
            conversation: [],
            error: err.message
        };
    }
})()
`;

export const TITLE_EXTRACTION_SCRIPT = `
(() => {
    try {
        const selectors = ${TITLE_SELECTORS_JSON};
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) {
                const text = el.textContent?.trim();
                // Only accept titles from the top bar, not the sidebar chat list
                const isInTopBar = !!el.closest('top-bar-actions') || !!el.closest('.conversation-title-container');
                if (text && isInTopBar) {
                    return text;
                }
            }
        }
        return '';
    } catch (err) {
        return '';
    }
})()
`;
