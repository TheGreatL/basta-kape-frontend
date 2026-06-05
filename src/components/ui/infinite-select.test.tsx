// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { useDebounce } from './infinite-select';

describe('useDebounce hook', () => {
    test('should return initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('hello', 300));
        expect(result.current).toBe('hello');
    });

    test('should update value only after specified delay', () => {
        vi.useFakeTimers();
        const { result, rerender } = renderHook(({ val }) => useDebounce(val, 300), {
            initialProps: { val: 'hello' }
        });

        expect(result.current).toBe('hello');

        // Rerender with new value
        rerender({ val: 'world' });
        expect(result.current).toBe('hello'); // still old value

        // Advance timers by 150ms (halfway)
        act(() => {
            vi.advanceTimersByTime(150);
        });
        expect(result.current).toBe('hello'); // still old value

        // Advance timers by another 150ms (300ms total)
        act(() => {
            vi.advanceTimersByTime(150);
        });
        expect(result.current).toBe('world'); // now updated

        vi.useRealTimers();
    });

    test('should cancel previous timer on value change', () => {
        vi.useFakeTimers();
        const { result, rerender } = renderHook(({ val }) => useDebounce(val, 300), {
            initialProps: { val: 'first' }
        });

        rerender({ val: 'second' });

        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(result.current).toBe('first');

        // Change again before first timer expires
        rerender({ val: 'third' });

        act(() => {
            vi.advanceTimersByTime(200);
        });
        // Total time since 'second' is 400ms, but 'third' was set 200ms ago, so still 'first'
        expect(result.current).toBe('first');

        act(() => {
            vi.advanceTimersByTime(100);
        });
        // Total time since 'third' is 300ms
        expect(result.current).toBe('third');

        vi.useRealTimers();
    });
});
