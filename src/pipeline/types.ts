export interface Redaction {
    start: number;
    end: number;
    label: string;
    text: string;
}

export interface Redactor {
    redact(text: string): Promise<Redaction[]>;
} 