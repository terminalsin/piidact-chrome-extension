const styleId = 'pii-chkr-styles';

function injectStyles() {
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        @keyframes pii-chkr-spinner-rotation {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .pii-chkr-loader svg {
            animation: pii-chkr-spinner-rotation 0.8s linear infinite;
        }
        .pii-chkr-indicator {
            position: absolute;
            width: 28px;
            height: 28px;
            background-color: #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 2147483647;
            transition: all 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28);
            transform: scale(0.3);
            opacity: 0;
        }
        .pii-chkr-indicator.visible {
            transform: scale(1);
            opacity: 1;
        }
    `;
    document.head.appendChild(style);
}

function createLoaderSVG(): SVGElement {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "black");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M21 12a9 9 0 1 1-6.219-8.56');
    svg.appendChild(path);
    return svg;
}

function createCheckmarkSVG(): SVGElement {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "green");
    svg.setAttribute("stroke-width", "2.5");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.innerHTML = `<polyline points="20 6 9 17 4 12"></polyline>`;
    return svg;
}


console.log("content script loaded");

document.addEventListener('paste', (event) => {
    const pastedText = event.clipboardData?.getData('text');

    if (pastedText && event.target) {
        event.preventDefault();

        injectStyles();

        const target = event.target as HTMLElement;

        const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"]');
        submitButtons.forEach(btn => (btn as HTMLButtonElement).disabled = true);

        let originalContentEditable: string | null = null;
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
            target.disabled = true;
        } else if (target.isContentEditable) {
            originalContentEditable = target.contentEditable;
            target.contentEditable = 'false';
        }

        const rect = target.getBoundingClientRect();

        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'pii-chkr-indicator pii-chkr-loader';
        loadingIndicator.appendChild(createLoaderSVG());
        loadingIndicator.style.top = `${window.scrollY + rect.top + 5}px`;
        loadingIndicator.style.left = `${window.scrollX + rect.left + rect.width - 35}px`;
        document.body.appendChild(loadingIndicator);
        requestAnimationFrame(() => {
            loadingIndicator.classList.add('visible');
        });


        chrome.runtime.sendMessage({ type: 'redact', text: pastedText }, (response) => {
            submitButtons.forEach(btn => (btn as HTMLButtonElement).disabled = false);
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
                target.disabled = false;
            } else if (originalContentEditable !== null) {
                target.contentEditable = originalContentEditable;
            }

            loadingIndicator.classList.remove('visible');
            setTimeout(() => {
                if (loadingIndicator.parentNode) {
                    loadingIndicator.parentNode.removeChild(loadingIndicator);
                }
            }, 300);

            console.log("response", response);
            if (response.success) {
                const redactions = response.redactions?.sort((a: any, b: any) => a.start - b.start) || [];
                const hasRedactions = redactions.length > 0;

                const successIndicator = document.createElement('div');
                successIndicator.className = 'pii-chkr-indicator';
                successIndicator.title = `Checked for PII with PII Chkr. ${hasRedactions ? 'Redactions applied.' : 'No PII found.'}`;
                successIndicator.appendChild(createCheckmarkSVG());

                const newRect = target.getBoundingClientRect();
                successIndicator.style.top = `${window.scrollY + newRect.top + 5}px`;
                successIndicator.style.left = `${window.scrollX + newRect.left + newRect.width - 35}px`;
                document.body.appendChild(successIndicator);
                requestAnimationFrame(() => {
                    successIndicator.classList.add('visible');
                });

                setTimeout(() => {
                    successIndicator.classList.remove('visible');
                    setTimeout(() => {
                        if (successIndicator.parentNode) {
                            successIndicator.parentNode.removeChild(successIndicator);
                        }
                    }, 300);
                }, 5000);

                let textToInsert = pastedText;
                if (hasRedactions) {
                    let newText = '';
                    let lastIndex = 0;
                    for (const r of redactions) {
                        newText += pastedText.substring(lastIndex, r.start);
                        newText += `[REDACTED_${r.label}]`;
                        lastIndex = r.end;
                    }
                    newText += pastedText.substring(lastIndex);
                    textToInsert = newText;
                }

                if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
                    const start = target.selectionStart ?? 0;
                    const end = target.selectionEnd ?? 0;
                    target.setRangeText(textToInsert, start, end, 'end');
                    target.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

                } else if (target.isContentEditable) {
                    const sel = window.getSelection();
                    if (sel?.rangeCount) {
                        const range = sel.getRangeAt(0);
                        range.deleteContents(); // Clear selection

                        // Create a single text node with the (potentially multi-line) redacted text
                        const textNode = document.createTextNode(textToInsert);
                        range.insertNode(textNode);

                        // Move cursor to the end of the inserted text
                        const newRange = document.createRange();
                        newRange.setStartAfter(textNode);
                        newRange.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(newRange);

                        target.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                    }
                }
            }
        });
    }
}, true); 