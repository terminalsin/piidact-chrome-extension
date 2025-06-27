import { RedactionPipeline } from './src/pipeline/pipeline';
import { RegexRedactor } from './src/pipeline/redactors/regex-redactor';
import { MistralRedactor } from './src/pipeline/redactors/mistral-redactor';

const pipeline = new RedactionPipeline([
    new RegexRedactor(),
    new MistralRedactor(),
]);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'redact-offscreen') {
        console.log('Offscreen script received:', request.text);
        pipeline.run(request.text)
            .then(redactions => {
                sendResponse({ success: true, redactions: redactions });
            })
            .catch(error => {
                console.error('Pipeline error:', error);
                sendResponse({ success: false, error: (error as Error).message });
            });
    }
    return true; // Keep the message channel open for async response
}); 