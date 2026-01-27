/**
 * Chat Extraction Script
 *
 * Injected into the Gemini iframe to extract the conversation as a structured JSON object.
 */

export const CHAT_EXTRACTION_SCRIPT = `
(() => {
    try {
        const selectors = {
            turns: ['chat-turn', 'conversation-turn', '.conversation-container', '.conversation-turn'],
            userQuery: ['.user-query', '.user-prompt-container', 'user-query'],
            userQueryText: ['.query-text', '.user-prompt-container', '.query-text-line'],
            modelResponse: ['.model-response', 'model-response', '.markdown'],
            modelResponseContent: ['.message-content', '.markdown', '.model-response-text'],
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

        return {
            title: document.title.replace(' - Gemini', '').trim(),
            timestamp: new Date().toISOString(),
            conversation,
            diagnostics: {
                turnSelector,
                totalTurns: turns.length,
                capturedTurns: conversation.length,
                url: window.location.href
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
