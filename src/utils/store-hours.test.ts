import { describe, it, expect } from 'vitest';
import { formatTime12h, getStoreStatus } from './store-hours';

describe('store-hours utility', () => {
    describe('formatTime12h', () => {
        it('formats 24-hour time strings to 12-hour AM/PM format', () => {
            expect(formatTime12h('07:00')).toBe('7:00 AM');
            expect(formatTime12h('12:00')).toBe('12:00 PM');
            expect(formatTime12h('15:30')).toBe('3:30 PM');
            expect(formatTime12h('21:00')).toBe('9:00 PM');
            expect(formatTime12h('00:00')).toBe('12:00 AM');
        });

        it('returns fallback for invalid or missing inputs', () => {
            expect(formatTime12h('')).toBe('');
            expect(formatTime12h(null)).toBe('');
            expect(formatTime12h(undefined)).toBe('');
            expect(formatTime12h('invalid')).toBe('invalid');
        });
    });

    describe('getStoreStatus', () => {
        it('identifies store as open when current time falls within opening and closing times', () => {
            const midDay = new Date('2026-11-16T14:00:00');
            const status = getStoreStatus('07:00', '21:00', midDay);
            expect(status.isOpen).toBe(true);
            expect(status.statusText).toBe('Open Now');
            expect(status.formattedHours).toBe('7:00 AM – 9:00 PM');
        });

        it('identifies store as closed before opening time', () => {
            const earlyMorning = new Date('2026-11-16T05:30:00');
            const status = getStoreStatus('07:00', '21:00', earlyMorning);
            expect(status.isOpen).toBe(false);
            expect(status.statusText).toBe('Closed • Opens at 7:00 AM');
        });

        it('identifies store as closed after closing time', () => {
            const lateNight = new Date('2026-11-16T22:30:00');
            const status = getStoreStatus('07:00', '21:00', lateNight);
            expect(status.isOpen).toBe(false);
            expect(status.statusText).toBe('Closed • Opens at 7:00 AM');
        });

        it('gracefully handles missing opening and closing times', () => {
            const status = getStoreStatus(null, null);
            expect(status.formattedHours).toBe('Hours not set');
            expect(status.statusText).toBe('Welcome');
        });
    });
});
