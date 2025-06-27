export const LABEL_MAP = {
    email: 'EMAIL',
    ssn: 'SSN',
    phone: 'PHONE',
    creditCard: 'CREDIT_CARD',
    bankAccount: 'BANK_ACCOUNT',
}

export const REGEXES = [
    {
        regex: /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi,
        name: 'email'
    },
    {
        regex: /(\d{3}-\d{2}-\d{4})/gi,
        name: 'ssn'
    },
    {
        // formats:
        // 123-456-7890
        // 1234567890
        // 123.456.7890
        // 1234567890
        // 1234567890
        // +1 (123) 456-7890
        // +1 123 456 7890
        // +11234567890
        // (123) 456-7890
        // (123)4567890
        regex: /(?:\+?1[-.\s]?)?(?:(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}|\d{10})/gi,
        name: 'phone'
    },
    {
        regex: /(\d{4}-\d{4}-\d{4}-\d{4})/gi,
        name: 'creditCard'
    },
    {
        regex: /(\d{4}-\d{4}-\d{4}-\d{4})/gi,
        name: 'bankAccount'
    }
] 