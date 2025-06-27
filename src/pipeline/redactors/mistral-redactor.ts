import { Mistral } from '@mistralai/mistralai';
import Fuse from 'fuse.js';
import type { Redactor, Redaction } from '../types';

// TODO: Replace with your actual Mistral API key
// You can get one from https://console.mistral.ai/
const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY;

class MistralRedactorSingleton {
    private static instance: any;

    static getInstance() {
        if (!MistralRedactorSingleton.instance) {
            MistralRedactorSingleton.instance = new Mistral({
                apiKey: MISTRAL_API_KEY,
            });
        }
        return MistralRedactorSingleton.instance;
    }
}

function escapeRegex(string: string): string {
    // $& means the whole matched string
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const accentMap: { [key: string]: string } = {
    'a': '[aáàâä]', 'e': '[eéèêë]', 'i': '[iíìîï]', 'o': '[oóòôö]', 'u': '[uúùûü]',
    'A': '[AÁÀÂÄ]', 'E': '[EÉÈÊË]', 'I': '[IÍÌÎÏ]', 'O': '[OÓÒÔÖ]', 'U': '[UÚÙÛÜ]',
    'c': '[cç]', 'C': '[CÇ]',
};

function buildWordPattern(word: string): string {
    return word.split('').map(char => {
        if (accentMap[char]) {
            return accentMap[char];
        }
        if (/[a-zA-Z0-9]/.test(char)) {
            return char;
        }
        // Make punctuation optional
        return escapeRegex(char) + '?';
    }).join('');
}

function buildFuzzyRegex(text: string): RegExp {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) {
        // Cannot build a regex from empty string.
        return new RegExp('a^', 'i'); // A regex that never matches.
    }
    const pattern = words.map(buildWordPattern).join('[\\s,.-]+');

    // Use word boundaries to ensure whole-word matching.
    return new RegExp(`\\b${pattern}\\b`, 'ig');
}

export class MistralRedactor implements Redactor {
    private client: Mistral;

    constructor() {
        this.client = MistralRedactorSingleton.getInstance();
    }

    async redact(text: string): Promise<Redaction[]> {
        const prompt = `You are a PII detection agent. Find all PII in the text below.
Respond with ONLY a valid JSON array of objects. Each object must have "text", "label" properties.
- "text": The exact text of the PII, in full, including any punctuation.
- "label": The category of PII (e.g., "EMAIL", "NAME").

Assume any name, location, or other information that reveals anything about a person is PII. Redact them. It is very important to redact names!

PII:
- Email addresses [EMAIL]
- Names [NAME]
- Phone numbers [PHONE] (eg: 123-456-7890 or +1 (123) 456-7890)
- Social Security Numbers [SSN] (eg: 123-45-6789)
- Credit Card Numbers [CREDIT_CARD]
- Bank Account Numbers [BANK_ACCOUNT]
- Passwords [PASSWORD]
- Locations [LOCATION]
- Addresses [ADDRESS] (eg: 123 Main St, Anytown, USA)
- University [UNIVERSITY]
- Town [TOWN]
- State [STATE]
- City [CITY]
- Country [COUNTRY]
- Zip Code [ZIP_CODE]
- Address [ADDRESS]
- Date of Birth [DATE_OF_BIRTH] (eg: 01/01/1990)
- Age [AGE]
- Gender [GENDER]
- Race [RACE]
- Ethnicity [ETHNICITY]
- Religion [RELIGION]
- Political Affiliation [POLITICAL_AFFILIATION]
- Sexual Orientation [SEXUAL_ORIENTATION]
- Gender Identity [GENDER_IDENTITY]
- License [LICENSE] (eg: S123-4564-7890-242)

If no PII is found, respond with an empty JSON array [].

Text:
${text}`;

        try {
            const response = await this.client.chat.complete({
                model: 'mistral-large-latest', // Using a small, fast model
                messages: [{ role: 'user', content: prompt }],
                responseFormat: { type: 'json_object' }
            });

            if (response.choices && response.choices.length > 0) {
                const content = response.choices[0].message.content;
                if (typeof content === 'string') {
                    // Assuming the content is a JSON string that needs to be parsed.
                    // Mistral's JSON mode should return a string that is a valid JSON.
                    try {
                        const rawRedactions = JSON.parse(content);
                        let piiList: { text: string; label: string }[] = [];
                        console.log("rawRedactions", rawRedactions);

                        if (Array.isArray(rawRedactions)) {
                            piiList = rawRedactions;
                        } else if (typeof rawRedactions === 'object' && rawRedactions !== null) {
                            const key = Object.keys(rawRedactions)[0];
                            if (key && Array.isArray((rawRedactions as any)[key])) {
                                piiList = (rawRedactions as any)[key];
                            }
                        }

                        const redactions: Redaction[] = [];

                        const piiToFind = piiList.filter(p => p.text && p.text.trim().length > 0);

                        for (const pii of piiToFind) {
                            const piiText = pii.text;
                            const len = piiText.length;

                            // Generate candidate substrings from the main text.
                            const candidates = [];
                            const maxLength = text.length;
                            const window = 5; // Allow for some length variation.

                            for (let i = 0; i <= maxLength - (len - window); i++) {
                                for (let j = -window; j <= window; j++) {
                                    const subLen = len + j;
                                    if (subLen <= 0) continue;
                                    const end = i + subLen;
                                    if (end > maxLength) continue;

                                    candidates.push({
                                        text: text.substring(i, end),
                                        start: i,
                                        end: end,
                                    });
                                }
                            }

                            if (candidates.length === 0) continue;

                            const fuse = new Fuse(candidates, {
                                keys: ['text'],
                                includeScore: true,
                                threshold: 0.2, // Tweak this for more/less strict matching
                                ignoreLocation: true,
                            });

                            const results = fuse.search(piiText);

                            if (results.length > 0) {
                                // Take the best match
                                const bestMatch = results[0].item;
                                redactions.push({
                                    text: bestMatch.text,
                                    label: pii.label,
                                    start: bestMatch.start,
                                    end: bestMatch.end,
                                });
                            }
                        }

                        console.log("redactions post: ", redactions);
                        return redactions;
                    } catch (e) {
                        console.error("Failed to parse JSON response from Mistral:", e);
                        return [];
                    }
                }
                return [];
            } else {
                return [];
            }
        } catch (error) {
            console.error('Error calling Mistral API:', error);
            // In case of an error, return no redactions
            return [];
        }
    }
} 