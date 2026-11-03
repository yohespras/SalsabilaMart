import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Product } from '../types';

/**
 * Normalizes raw input from wired USB, USB-OTG, Bluetooth, or camera barcode scanners.
 * Removes non-printable ASCII control codes (STX, ETX, CR, LF, TAB) and zero-width characters.
 */
export function cleanBarcodeString(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[\x00-\x1F\x7F\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

/**
 * Updates a React-controlled <input> or <textarea> value safely without desyncing
 * React's internal _valueTracker state.
 */
export function setReactInputValue(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  newValue: string
): void {
  if (!el) return;
  try {
    const prototype =
      el instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const nativeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (nativeValueSetter) {
      nativeValueSetter.call(el, newValue);
    } else {
      el.value = newValue;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  } catch {
    el.value = newValue;
  }
}

/**
 * Highly tolerant product lookup for retail barcodes:
 * - Exact match on barcode or SKU/ID
 * - Case-insensitive
 * - Handles UPC-A (12 digits) vs EAN-13 (13 digits with leading zero)
 * - Ignores common barcode spacers (dashes, spaces)
 */
export function matchProductBarcode(products: Product[], rawScanned: string): Product | undefined {
  const clean = cleanBarcodeString(rawScanned);
  if (!clean) return undefined;

  const cleanLower = clean.toLowerCase();

  // 1. Direct match on barcode or product ID
  let match = products.find(
    (p) => p.barcode.toLowerCase() === cleanLower || p.id.toLowerCase() === cleanLower
  );
  if (match) return match;

  // 2. Alphanumeric only match (stripping dashes or spaces, e.g. 899-2388-123456)
  const alphanumericClean = cleanLower.replace(/[^a-z0-9]/g, '');
  if (alphanumericClean.length >= 3) {
    match = products.find(
      (p) =>
        p.barcode.toLowerCase().replace(/[^a-z0-9]/g, '') === alphanumericClean ||
        p.id.toLowerCase().replace(/[^a-z0-9]/g, '') === alphanumericClean
    );
    if (match) return match;
  }

  // 3. Leading Zero Tolerance (UPC-A 12 digits vs EAN-13 13 digits)
  if (alphanumericClean.length === 12) {
    const withZero = '0' + alphanumericClean;
    match = products.find(
      (p) => p.barcode.toLowerCase().replace(/[^a-z0-9]/g, '') === withZero
    );
    if (match) return match;
  }

  if (alphanumericClean.length === 13 && alphanumericClean.startsWith('0')) {
    const withoutZero = alphanumericClean.slice(1);
    match = products.find(
      (p) => p.barcode.toLowerCase().replace(/[^a-z0-9]/g, '') === withoutZero
    );
    if (match) return match;
  }

  match = products.find((p) => {
    const prodClean = p.barcode.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (
      prodClean.length === 13 &&
      prodClean.startsWith('0') &&
      prodClean.slice(1) === alphanumericClean
    ) {
      return true;
    }
    if (
      alphanumericClean.length === 13 &&
      alphanumericClean.startsWith('0') &&
      alphanumericClean.slice(1) === prodClean
    ) {
      return true;
    }
    return false;
  });

  return match;
}

/**
 * Tracks whether the current browser window / iframe has keyboard focus,
 * and provides a 1-click helper to lock focus onto a scanner input.
 */
export function useWindowFocusStatus() {
  const [isWindowFocused, setIsWindowFocused] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.hasFocus() : true
  );

  useEffect(() => {
    const onFocus = () => setIsWindowFocused(true);
    const onBlur = () => setIsWindowFocused(false);
    const onPointerDown = () => setIsWindowFocused(true);

    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pointerdown', onPointerDown, true);

    const interval = setInterval(() => {
      if (typeof document !== 'undefined') {
        setIsWindowFocused(document.hasFocus());
      }
    }, 1200);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pointerdown', onPointerDown, true);
      clearInterval(interval);
    };
  }, []);

  const activateScannerFocus = useCallback((preferredInput?: HTMLInputElement | null) => {
    try {
      window.focus();
      if (preferredInput) {
        preferredInput.focus({ preventScroll: true });
      } else {
        const sink = document.querySelector<HTMLInputElement>('[data-barcode-sink="true"]');
        sink?.focus({ preventScroll: true });
      }
      setIsWindowFocused(true);
    } catch {
      // Ignore focus errors
    }
  }, []);

  return { isWindowFocused, activateScannerFocus };
}

export interface HardwareScannerHookOptions {
  onScan: (barcode: string) => void;
  onKeyActivity?: (partialBuffer: string, rawKey: string) => void;
  enabled?: boolean;
  minLength?: number;
  // Maximum time (ms) allowed between keystrokes to be considered part of a scanner burst
  maxCharIntervalMs?: number;
}

const IGNORED_MODIFIER_KEYS = new Set([
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'CapsLock',
  'NumLock',
  'ScrollLock',
  'Fn',
  'FnLock',
]);

/**
 * Bulletproof global listener for wired USB, USB-OTG (Android keyCode 229 / Unidentified),
 * Bluetooth HID, and Wireless 2.4GHz barcode scanners.
 *
 * Key guarantees:
 * 1. Never drops the 1st character of a barcode scan even when a regular input is focused.
 * 2. Prevents scanner bursts from polluting regular text/number inputs (Search, Price, Name).
 * 3. Supports Enter, NumpadEnter, keyCode 13, Tab, CR/LF newline injection, AND suffix-less scanners.
 * 4. Distinguish dedicated clear-on-scan inputs (`data-barcode-input="true"`) from
 *    keep-value form inputs (`data-barcode-form-field="true"`).
 */
export function useHardwareBarcodeScanner({
  onScan,
  onKeyActivity,
  enabled = true,
  minLength = 3,
  maxCharIntervalMs = 160,
}: HardwareScannerHookOptions) {
  const bufferRef = useRef<string>('');
  const burstStartTimeRef = useRef<number>(0);
  const lastCharTimeRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otgDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otgStartTimeRef = useRef<number>(0);
  const lastEmittedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  // Restores original value if a scanner burst started while focused on a regular input
  const burstRestoreRef = useRef<{
    el: HTMLInputElement | HTMLTextAreaElement;
    value: string;
    restored: boolean;
  } | null>(null);

  // Tracks prior value on a barcode form field so re-scanning replaces instead of concatenating
  const formFieldPriorRef = useRef<{
    el: HTMLInputElement;
    priorValue: string;
    replaced: boolean;
  } | null>(null);

  const onScanRef = useRef(onScan);
  const onKeyActivityRef = useRef(onKeyActivity);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    onKeyActivityRef.current = onKeyActivity;
  }, [onKeyActivity]);

  useEffect(() => {
    if (!enabled) return;

    const clearTimers = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (otgDebounceTimerRef.current) {
        clearTimeout(otgDebounceTimerRef.current);
        otgDebounceTimerRef.current = null;
      }
    };

    const resetBurstState = () => {
      bufferRef.current = '';
      burstStartTimeRef.current = 0;
      burstRestoreRef.current = null;
      formFieldPriorRef.current = null;
    };

    const emitScan = (rawCode: string) => {
      const code = cleanBarcodeString(rawCode);
      if (code.length < minLength) return;

      const now = Date.now();
      // Guard against duplicate firing from both keydown(Enter) and input(newline/debounce) on same scan
      if (lastEmittedRef.current.code === code && now - lastEmittedRef.current.time < 130) {
        return;
      }
      lastEmittedRef.current = { code, time: now };
      onScanRef.current(code);
    };

    const classifyTarget = (target: HTMLElement | null) => {
      const isBarcodeSink = Boolean(target && target.getAttribute('data-barcode-sink') === 'true');
      const isBarcodeFormField = Boolean(
        target && target.getAttribute('data-barcode-form-field') === 'true'
      );
      const isBarcodeInput = Boolean(
        target &&
          !isBarcodeFormField &&
          !isBarcodeSink &&
          (target.getAttribute('data-barcode-input') === 'true' ||
            target.getAttribute('name') === 'barcode' ||
            target.classList.contains('barcode-input-field'))
      );
      const isAnyTextInput = Boolean(
        target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
      );
      const isRegularInput =
        isAnyTextInput && !isBarcodeSink && !isBarcodeInput && !isBarcodeFormField;

      return {
        isBarcodeSink,
        isBarcodeInput,
        isBarcodeFormField,
        isRegularInput,
      };
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not disturb burst timing on Shift / Control / CapsLock (common on Code128 uppercase barcodes)
      if (IGNORED_MODIFIER_KEYS.has(e.key)) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = lastCharTimeRef.current > 0 ? currentTime - lastCharTimeRef.current : 99999;
      const target = e.target as HTMLElement | null;
      const { isBarcodeSink, isBarcodeInput, isBarcodeFormField, isRegularInput } =
        classifyTarget(target);

      const isEnterKey =
        e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13;
      const isTabKey = e.key === 'Tab' || e.keyCode === 9;

      // 1. Check Line Terminators (Enter / NumpadEnter / Tab)
      if (isEnterKey || isTabKey) {
        // Expire stale buffer if user paused a long time before pressing Enter/Tab
        const isFreshBurst = timeDiff <= Math.max(maxCharIntervalMs * 2, 350);
        const cleanBuf = isFreshBurst ? cleanBarcodeString(bufferRef.current) : '';

        let scannedValue = '';

        if (isBarcodeSink || isBarcodeInput) {
          const inputVal = cleanBarcodeString((target as HTMLInputElement).value);
          // For Tab key, only intercept if there is a valid barcode in buffer or sink
          if (isTabKey && cleanBuf.length < minLength && !isBarcodeSink) {
            resetBurstState();
            return;
          }
          scannedValue = inputVal.length > cleanBuf.length ? inputVal : cleanBuf;
          if (scannedValue.length >= minLength) {
            e.preventDefault();
            e.stopPropagation();
            clearTimers();
            resetBurstState();
            setReactInputValue(target as HTMLInputElement, '');
            emitScan(scannedValue);
            return;
          }
        } else if (isBarcodeFormField) {
          const inputVal = cleanBarcodeString((target as HTMLInputElement).value);
          if (isTabKey && cleanBuf.length < minLength) {
            resetBurstState();
            return;
          }
          // If a fresh rapid burst just occurred, prefer cleanBuf so old barcode isn't concatenated
          const burstAvg =
            cleanBuf.length > 1
              ? (lastCharTimeRef.current - burstStartTimeRef.current) / (cleanBuf.length - 1)
              : 999;
          scannedValue =
            cleanBuf.length >= minLength && burstAvg <= 95 ? cleanBuf : inputVal || cleanBuf;

          if (scannedValue.length >= minLength) {
            e.preventDefault();
            e.stopPropagation();
            clearTimers();
            resetBurstState();
            setReactInputValue(target as HTMLInputElement, scannedValue);
            emitScan(scannedValue);
            return;
          }
        } else if (isRegularInput) {
          // Inside a regular input (Search, Name, Price): ONLY intercept Enter/Tab if a rapid scanner burst occurred!
          const burstAvg =
            cleanBuf.length > 1
              ? (lastCharTimeRef.current - burstStartTimeRef.current) / (cleanBuf.length - 1)
              : 999;
          if (cleanBuf.length >= minLength && burstAvg <= 90) {
            e.preventDefault();
            e.stopPropagation();
            clearTimers();
            if (burstRestoreRef.current) {
              setReactInputValue(burstRestoreRef.current.el, burstRestoreRef.current.value);
            }
            resetBurstState();
            emitScan(cleanBuf);
            return;
          }
          resetBurstState();
          return;
        } else {
          // Focus is on body / button / non-input
          if (cleanBuf.length >= minLength) {
            e.preventDefault();
            e.stopPropagation();
            clearTimers();
            resetBurstState();
            emitScan(cleanBuf);
            return;
          }
        }

        resetBurstState();
        return;
      }

      // 2. Printable Single Character Key
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        lastCharTimeRef.current = currentTime;

        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }

        // Reset stale buffer if interval exceeded maxCharIntervalMs
        if (timeDiff > maxCharIntervalMs && bufferRef.current.length > 0) {
          resetBurstState();
        }

        if (isRegularInput) {
          const inputEl = target as HTMLInputElement | HTMLTextAreaElement;
          if (bufferRef.current.length === 0) {
            // Always record 1st character candidate so digit #1 is NEVER lost!
            burstStartTimeRef.current = currentTime;
            burstRestoreRef.current = {
              el: inputEl,
              value: inputEl.value ?? '',
              restored: false,
            };
            bufferRef.current = e.key;
            return;
          }

          // Subsequent characters in regular input must arrive at scanner speed (<= 85ms)
          if (timeDiff > 85) {
            burstStartTimeRef.current = currentTime;
            burstRestoreRef.current = {
              el: inputEl,
              value: inputEl.value ?? '',
              restored: false,
            };
            bufferRef.current = e.key;
            return;
          }

          bufferRef.current += e.key;

          // Once 3+ characters arrive within <= 85ms each, this is unmistakably a barcode gun!
          if (bufferRef.current.length >= 3) {
            e.preventDefault();
            e.stopPropagation();
            if (burstRestoreRef.current && !burstRestoreRef.current.restored) {
              setReactInputValue(burstRestoreRef.current.el, burstRestoreRef.current.value);
              burstRestoreRef.current.restored = true;
            }
            onKeyActivityRef.current?.(bufferRef.current, e.key);

            // Auto-flush fallback for scanners configured WITHOUT Enter suffix
            if (bufferRef.current.length >= Math.max(4, minLength)) {
              debounceTimerRef.current = setTimeout(() => {
                const candidate = cleanBarcodeString(bufferRef.current);
                if (candidate.length >= minLength) {
                  if (burstRestoreRef.current) {
                    setReactInputValue(burstRestoreRef.current.el, burstRestoreRef.current.value);
                  }
                  resetBurstState();
                  emitScan(candidate);
                }
              }, 220);
            }
          }
          return;
        }

        if (isBarcodeFormField) {
          const inputEl = target as HTMLInputElement;
          if (bufferRef.current.length === 0) {
            burstStartTimeRef.current = currentTime;
            formFieldPriorRef.current = {
              el: inputEl,
              priorValue: inputEl.value ?? '',
              replaced: false,
            };
            bufferRef.current = e.key;
          } else {
            bufferRef.current += e.key;
            const burstAvg =
              (currentTime - burstStartTimeRef.current) / Math.max(1, bufferRef.current.length - 1);

            // If field already had an old barcode and user shoots scanner gun, replace cleanly instead of concatenating
            if (
              bufferRef.current.length >= 3 &&
              burstAvg <= 90 &&
              formFieldPriorRef.current &&
              formFieldPriorRef.current.priorValue.length > 0 &&
              !formFieldPriorRef.current.replaced
            ) {
              e.preventDefault();
              formFieldPriorRef.current.replaced = true;
              setReactInputValue(inputEl, bufferRef.current);
            } else if (formFieldPriorRef.current?.replaced) {
              e.preventDefault();
              setReactInputValue(inputEl, bufferRef.current);
            }
          }

          onKeyActivityRef.current?.(bufferRef.current, e.key);

          if (bufferRef.current.length >= Math.max(4, minLength)) {
            debounceTimerRef.current = setTimeout(() => {
              const candidate = cleanBarcodeString(bufferRef.current);
              const avg =
                candidate.length > 1
                  ? (lastCharTimeRef.current - burstStartTimeRef.current) / (candidate.length - 1)
                  : 999;
              if (candidate.length >= minLength && avg <= 95) {
                resetBurstState();
                setReactInputValue(inputEl, candidate);
                emitScan(candidate);
              }
            }, 220);
          }
          return;
        }

        // Dedicated barcode input (`isBarcodeInput`), hidden sink (`isBarcodeSink`), or non-input (`body`)
        if (bufferRef.current.length === 0) {
          burstStartTimeRef.current = currentTime;
        }
        bufferRef.current += e.key;
        onKeyActivityRef.current?.(bufferRef.current, e.key);

        if (bufferRef.current.length >= Math.max(4, minLength)) {
          debounceTimerRef.current = setTimeout(() => {
            const candidate = cleanBarcodeString(bufferRef.current);
            const avg =
              candidate.length > 1
                ? (lastCharTimeRef.current - burstStartTimeRef.current) / (candidate.length - 1)
                : 999;
            // Only auto-flush without Enter if characters arrived at hardware scanner speed (<= 95ms/char)
            if (candidate.length >= minLength && avg <= 95) {
              resetBurstState();
              if (isBarcodeInput || isBarcodeSink) {
                setReactInputValue(target as HTMLInputElement, '');
              }
              emitScan(candidate);
            }
          }, 220);
        }
      }
    };

    /**
     * Handles DOM `input` events on dedicated barcode inputs & global scanner sink.
     * Crucial for wired USB scanners connected via USB-OTG on Android/tablets or IMEs
     * that emit `e.key === 'Unidentified'` (keyCode 229) during `keydown`.
     */
    const handleInput = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const { isBarcodeSink, isBarcodeInput, isBarcodeFormField } = classifyTarget(target);
      if (!isBarcodeSink && !isBarcodeInput && !isBarcodeFormField) return;

      const inputEl = target as HTMLInputElement;
      const rawVal = inputEl.value || '';
      if (!rawVal) {
        otgStartTimeRef.current = 0;
        return;
      }

      const now = Date.now();
      if (otgStartTimeRef.current === 0) {
        otgStartTimeRef.current = now;
      }

      // 1. Immediate flush if scanner injected CR / LF directly into the input value
      if (/[\r\n]/.test(rawVal)) {
        const cleaned = cleanBarcodeString(rawVal);
        clearTimers();
        resetBurstState();
        otgStartTimeRef.current = 0;
        setReactInputValue(inputEl, isBarcodeFormField ? cleaned : '');
        if (cleaned.length >= minLength) {
          emitScan(cleaned);
        }
        return;
      }

      // 2. If keydown didn't populate bufferRef (e.g. keyCode 229 Unidentified OTG scanner or paste burst)
      const cleaned = cleanBarcodeString(rawVal);
      if (bufferRef.current.length === 0 && cleaned.length > 0) {
        onKeyActivityRef.current?.(cleaned, 'USB/OTG');
      }

      if (isBarcodeSink || (bufferRef.current.length === 0 && cleaned.length >= Math.max(4, minLength))) {
        if (otgDebounceTimerRef.current) {
          clearTimeout(otgDebounceTimerRef.current);
        }
        otgDebounceTimerRef.current = setTimeout(() => {
          const latestRaw = inputEl.value || '';
          const latestClean = cleanBarcodeString(latestRaw);
          const elapsed = Date.now() - (otgStartTimeRef.current || now);
          const avgPerChar = latestClean.length > 1 ? elapsed / latestClean.length : 0;

          if (latestClean.length >= minLength && (isBarcodeSink || avgPerChar <= 105)) {
            resetBurstState();
            otgStartTimeRef.current = 0;
            setReactInputValue(inputEl, isBarcodeFormField ? latestClean : '');
            emitScan(latestClean);
          }
        }, 230);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('input', handleInput, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('input', handleInput, true);
      clearTimers();
    };
  }, [enabled, minLength, maxCharIntervalMs]);
}

/**
 * Invisible, zero-keyboard-popup (`inputMode="none"`) DOM input sink.
 * Ensures wired USB-OTG & HID barcode scanners that require an active <input>
 * ALWAYS have a valid target whenever no other form field is focused.
 */
export const GlobalScannerSink: React.FC<{ active?: boolean }> = ({ active = true }) => {
  const sinkRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const ensureSinkFocusedIfIdle = () => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isIdle =
        !activeEl ||
        activeEl === document.body ||
        activeEl === document.documentElement;

      if (isIdle && sinkRef.current) {
        sinkRef.current.focus({ preventScroll: true });
      }
    };

    // Focus gently on mount
    const initTimer = setTimeout(ensureSinkFocusedIfIdle, 120);

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest(
        'input, textarea, select, button, a, label, [contenteditable="true"]'
      );
      if (!interactive) {
        setTimeout(ensureSinkFocusedIfIdle, 20);
      }
    };

    window.addEventListener('click', handleClick);
    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('click', handleClick);
    };
  }, [active]);

  if (!active) return null;

  return React.createElement('input', {
    ref: sinkRef,
    type: 'text',
    inputMode: 'none',
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
    tabIndex: -1,
    'aria-hidden': 'true',
    'data-barcode-sink': 'true',
    className: 'fixed -top-24 left-0 w-px h-px opacity-0 pointer-events-none',
  });
};
