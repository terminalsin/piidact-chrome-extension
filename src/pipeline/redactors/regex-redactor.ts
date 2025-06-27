import type { Redactor, Redaction } from '../types';
import { LABEL_MAP, REGEXES } from '../../lib/regexes';

export class RegexRedactor implements Redactor {
    async redact(text: string): Promise<Redaction[]> {
        const redactions: Redaction[] = [];
        let match;

        for (const regex of REGEXES) {
            while ((match = regex.regex.exec(text)) !== null) {
                redactions.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                    label: LABEL_MAP[regex.name as keyof typeof LABEL_MAP]
                });
            }
        }

        return redactions;
    }
} 