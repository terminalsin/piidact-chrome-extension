import { describe, it, expect } from 'vitest';
import { REGEXES } from './regexes';

const getRegex = (name: string) => {
    const regex = REGEXES.find(r => r.name === name);
    if (!regex) {
        throw new Error(`Regex with name "${name}" not found`);
    }
    // Return a new RegExp object to reset the lastIndex property
    return new RegExp(regex.regex);
}

describe('Regex-based PII detection', () => {
    describe('Email Regex', () => {
        // Inclusive cases
        it('should detect a standard email address', () => {
            const emailRegex = getRegex('email');
            const text = 'Contact me at test@example.com.';
            expect(emailRegex.test(text)).toBe(true);
            const matches = text.match(emailRegex);
            expect(matches).not.toBeNull();
            if (matches) {
                expect(matches[0]).toBe('test@example.com');
            }
        });

        it('should detect an email with a subdomain', () => {
            const emailRegex = getRegex('email');
            const text = 'My email is user@mail.example.co.uk.';
            expect(emailRegex.test(text)).toBe(true);
        });

        it('should detect an email with numbers in the local part', () => {
            const emailRegex = getRegex('email');
            const text = 'Email: user123@example.com.';
            expect(emailRegex.test(text)).toBe(true);
        });

        it('should detect an email with special characters in the local part', () => {
            const emailRegex = getRegex('email');
            const text = 'You can reach me at user.name+tag@example.com.';
            expect(emailRegex.test(text)).toBe(true);
        });

        // Exclusive cases
        it('should not detect an incomplete email address (missing @)', () => {
            const emailRegex = getRegex('email');
            const text = 'This is not an email: test.example.com';
            expect(emailRegex.test(text)).toBe(false);
        });

        it('should not detect an email with spaces', () => {
            const emailRegex = getRegex('email');
            const text = 'Invalid email: test @ example.com';
            expect(emailRegex.test(text)).toBe(false);
        });

        it('should not detect an email with invalid domain', () => {
            const emailRegex = getRegex('email');
            const text = 'This is not valid: test@.com';
            expect(emailRegex.test(text)).toBe(false);
        });

        it('should not misinterpret other uses of @', () => {
            const emailRegex = getRegex('email');
            const text = 'Look at this handle: @username';
            expect(emailRegex.test(text)).toBe(false);
        });
    });

    describe('SSN Regex', () => {
        it('should detect a standard SSN', () => {
            const ssnRegex = getRegex('ssn');
            const text = 'Her SSN is 123-45-6789.';
            expect(ssnRegex.test(text)).toBe(true);
        });

        it('should not detect an incomplete SSN', () => {
            const ssnRegex = getRegex('ssn');
            const text = 'Not an SSN: 123-45-678';
            expect(ssnRegex.test(text)).toBe(false);
        });

        it('should not detect numbers in a different format', () => {
            const ssnRegex = getRegex('ssn');
            const text = 'This is not an SSN: 123 45 6789';
            expect(ssnRegex.test(text)).toBe(false);
        });
    });

    describe('Phone Number Regex', () => {
        it('should detect a standard 10-digit phone number', () => {
            const phoneRegex = getRegex('phone');
            const text = 'Call me at 123-456-7890.';
            expect(phoneRegex.test(text)).toBe(true);
        });

        it('should detect a phone number with country code', () => {
            const phoneRegex = getRegex('phone');
            const text = 'My number is +1 (123) 456-7890.';
            expect(phoneRegex.test(text)).toBe(true);
        });

        it('should detect a phone number with different separators', () => {
            const phoneRegex = getRegex('phone');
            const text = 'Phone: 123.456.7890';
            expect(phoneRegex.test(text)).toBe(true);
        });

        it('should not detect a number that is too short', () => {
            const phoneRegex = getRegex('phone');
            const text = 'Not a phone number: 123-456';
            expect(phoneRegex.test(text)).toBe(false);
        });
    });

    describe('Credit Card Regex', () => {
        it('should detect a standard credit card number', () => {
            const creditCardRegex = getRegex('creditCard');
            const text = 'CC: 1234-5678-9012-3456';
            expect(creditCardRegex.test(text)).toBe(true);
        });

        it('should not detect a number with incorrect formatting', () => {
            const creditCardRegex = getRegex('creditCard');
            const text = 'Invalid CC: 1234 5678 9012 3456';
            expect(creditCardRegex.test(text)).toBe(false);
        });
    });

    describe('Bank Account Regex', () => {
        it('should detect a bank account number', () => {
            const bankAccountRegex = getRegex('bankAccount');
            const text = 'Account: 1234-5678-9012-3456';
            expect(bankAccountRegex.test(text)).toBe(true);
        });

        it('should not detect a number with incorrect formatting', () => {
            const bankAccountRegex = getRegex('bankAccount');
            const text = 'Invalid Account: 1234 5678 9012';
            expect(bankAccountRegex.test(text)).toBe(false);
        });
    });
}); 