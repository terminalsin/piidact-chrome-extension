import { pipeline, env } from '@huggingface/transformers';
import type { Redactor, Redaction } from '../types';

// Configure the WASM backend to use local files
if (env.backends.onnx.wasm) {
    env.backends.onnx.wasm.wasmPaths = '/wasm/';
}

class LlmRedactorSingleton {
    private static instance: Promise<any>;

    static async getInstance() {
        if (!LlmRedactorSingleton.instance) {
            LlmRedactorSingleton.instance = pipeline("token-classification", "phatvo/deberta_finetuned_pii-ONNX", {
                dtype: "auto"
            });
        }
        return LlmRedactorSingleton.instance;
    }
}

export class LlmRedactor implements Redactor {
    private nlp;

    constructor() {
        this.nlp = LlmRedactorSingleton.getInstance();
    }

    async redact(text: string): Promise<Redaction[]> {
        const classifier = await this.nlp;
        const entities = await classifier(text);

        console.log("entities", entities);

        const mergedEntities = this.aggressiveMergeTokens(entities);
        console.log("Aggressively merged tokens:", mergedEntities);

        const redactions: Redaction[] = [];
        for (const entity of mergedEntities) {
            if (entity.score > 0.8) { // Confidence threshold
                const fuzzyRegex = this.buildFuzzyRegex(entity.text);

                if (fuzzyRegex) {
                    const matches = text.matchAll(fuzzyRegex);
                    for (const match of matches) {
                        redactions.push({
                            start: match.index,
                            end: match.index + match[0].length,
                            label: entity.type.toUpperCase(),
                            text: match[0],
                        });
                    }
                }
            }
        }

        return redactions;
    }

    private aggressiveMergeTokens(entities: any[]): { type: string, text: string, score: number }[] {
        if (!Array.isArray(entities) || entities.length === 0) {
            return [];
        }

        const merged = [];
        let current: { type: string, text: string, score: number } | null = null;

        for (const entity of entities) {
            const type = entity.entity.replace(/^(B-|I-)/, '');
            // Aggressively clean the word
            const word = entity.word.replace(/ /g, '').replace(/[^a-zA-Z0-9]/g, '');

            if (!word) continue;

            if (!current) {
                current = { type, text: word, score: entity.score };
            } else if (current.type === type) {
                current.text += word;
                current.score = Math.max(current.score, entity.score);
            } else {
                merged.push(current);
                current = { type, text: word, score: entity.score };
            }
        }

        if (current) {
            merged.push(current);
        }
        return merged;
    }

    private escapeRegexChars(str: string): string {
        return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    private buildFuzzyRegex(mergedString: string): RegExp | null {
        // Clean the string of characters that are not part of the match
        const cleanedString = mergedString.replace(/[^a-zA-Z0-9]/g, '');
        if (!cleanedString) {
            return null;
        }

        const pattern = cleanedString.split('').map(char => this.escapeRegexChars(char)).join('[\\s\\p{P}]*');

        try {
            return new RegExp(pattern, 'igu');
        } catch (err) {
            console.warn(`Regex build failed for pattern="${pattern}". Error: ${err}`);
            return null;
        }
    }
} 