let creating: Promise<void> | null;

async function setupOffscreenDocument() {
    const offscreenUrl = chrome.runtime.getURL('offscreen.html');
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT' as any],
        documentUrls: [offscreenUrl]
    });

    if (existingContexts.length > 0) {
        return;
    }

    if (creating) {
        await creating;
    } else {
        creating = chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['BLOBS'],
            justification: 'Needed for ML model inference.',
        });
        await creating;
        creating = null;
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'redact') {
        setupOffscreenDocument().then(() => {
            chrome.runtime.sendMessage(
                {
                    type: 'redact-offscreen',
                    text: request.text,
                },
                (response) => {
                    sendResponse(response);
                }
            );
        });
        return true;
    }
}); 