import type { Redactor, Redaction } from './types';

export class RedactionPipeline {
    constructor(private redactors: Redactor[]) { }

    async run(text: string): Promise<Redaction[]> {
        const allRedactions: Redaction[] = [];
        const promises = this.redactors.map(redactor => redactor.redact(text));
        const results = await Promise.all(promises);
        for (const redactions of results) {
            allRedactions.push(...redactions);
        }

        if (allRedactions.length === 0) {
            return [];
        }

        // merge all redactions with the same character range
        // or in the same range but with different labels
        const mergedRedactions: Redaction[] = [];
        for (const redaction of allRedactions) {
            const existing = mergedRedactions
                .find(r => r.start <= redaction.start && r.end >= redaction.end);
            if (existing) {
                existing.text += redaction.text;

                if (existing.label !== redaction.label) {
                    existing.label = `${existing.label}/${redaction.label}`;
                }

                existing.text = redaction.text;
                existing.end = redaction.end;
                existing.start = redaction.start;
            } else {
                mergedRedactions.push(redaction);
            }
        }

        return mergedRedactions;
    }
} 