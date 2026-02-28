import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CaptureView from './CaptureView';

vi.mock('@/lib/db', () => ({
    addNote: vi.fn().mockResolvedValue(1),
}));

vi.mock('@/lib/ai', () => ({
    autoTagNote: vi.fn().mockResolvedValue(undefined),
}));

import { addNote } from '@/lib/db';
import { autoTagNote } from '@/lib/ai';
const mockAddNote = vi.mocked(addNote);
const mockAutoTagNote = vi.mocked(autoTagNote);

function makeMockRecognition() {
    const handlers: Record<string, ((e: unknown) => void) | null> = {
        onresult: null,
        onend: null,
        onerror: null,
    };
    const mock = {
        lang: '',
        interimResults: false,
        maxAlternatives: 1,
        start: vi.fn(),
        stop: vi.fn(() => {
            handlers.onend?.(undefined);
        }),
        set onresult(fn: ((e: unknown) => void) | null) {
            handlers.onresult = fn;
        },
        get onresult() {
            return handlers.onresult;
        },
        set onend(fn: ((e: unknown) => void) | null) {
            handlers.onend = fn;
        },
        get onend() {
            return handlers.onend;
        },
        set onerror(fn: ((e: unknown) => void) | null) {
            handlers.onerror = fn;
        },
        get onerror() {
            return handlers.onerror;
        },
        _fireResult(transcript: string) {
            handlers.onresult?.({
                results: [[{ transcript }]],
            });
        },
        _fireEnd() {
            handlers.onend?.(undefined);
        },
    };
    return mock;
}

beforeEach(() => {
    mockAddNote.mockClear();
    mockAutoTagNote.mockClear();
    // Remove any SpeechRecognition mock between tests
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', { value: vi.fn(), configurable: true, writable: true });
});

describe('CaptureView', () => {
    it('renders a textarea and Save button', () => {
        render(<CaptureView />);
        expect(screen.getByRole('textbox', { name: /note text/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('Save button is disabled when textarea is empty', () => {
        render(<CaptureView />);
        expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    it('Save button is enabled when text is entered', () => {
        render(<CaptureView />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
        expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
    });

    it('Save button is disabled when text is only whitespace', () => {
        render(<CaptureView />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
        expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    it('calls addNote with trimmed text on Save click', async () => {
        render(<CaptureView />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '  my note  ' } });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /save/i }));
        });
        expect(mockAddNote).toHaveBeenCalledOnce();
        expect(mockAddNote).toHaveBeenCalledWith('my note');
    });

    it('calls autoTagNote with the saved note id and text after save', async () => {
        mockAddNote.mockResolvedValue(42);
        render(<CaptureView />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'tag this note' } });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /save/i }));
        });
        await waitFor(() => expect(mockAutoTagNote).toHaveBeenCalledWith(42, 'tag this note'));
    });

    it('clears textarea after save', async () => {
        render(<CaptureView />);
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'my note' } });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /save/i }));
        });
        expect(textarea).toHaveValue('');
    });

    it('shows saved confirmation after save', async () => {
        render(<CaptureView />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'my note' } });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /save/i }));
        });
        await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    });

    it('triggers haptic feedback on save', async () => {
        render(<CaptureView />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'my note' } });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /save/i }));
        });
        expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });

    it('saves on Ctrl+Enter', async () => {
        render(<CaptureView />);
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'keyboard save' } });
        await act(async () => {
            fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
        });
        expect(mockAddNote).toHaveBeenCalledOnce();
        expect(mockAddNote).toHaveBeenCalledWith('keyboard save');
    });

    it('does not save on Ctrl+Enter when empty', async () => {
        render(<CaptureView />);
        const textarea = screen.getByRole('textbox');
        await act(async () => {
            fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
        });
        expect(mockAddNote).not.toHaveBeenCalled();
    });

    describe('mic button', () => {
        it('renders a mic button', () => {
            render(<CaptureView />);
            expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
        });

        it('does not crash when SpeechRecognition is unavailable', () => {
            render(<CaptureView />);
            // SpeechRecognition is not set in jsdom — clicking should be a no-op
            expect(() => {
                fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
            }).not.toThrow();
        });

        it('starts recognition and shows listening state', async () => {
            const mockRec = makeMockRecognition();
            (window as unknown as Record<string, unknown>).SpeechRecognition = vi.fn(function () {
                return mockRec;
            });

            render(<CaptureView />);
            const micBtn = screen.getByRole('button', { name: /start recording/i });

            await act(async () => {
                fireEvent.click(micBtn);
            });

            expect(mockRec.start).toHaveBeenCalledOnce();
            expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument();
        });

        it('appends transcript to textarea when speech is recognized', async () => {
            const mockRec = makeMockRecognition();
            (window as unknown as Record<string, unknown>).SpeechRecognition = vi.fn(function () {
                return mockRec;
            });

            render(<CaptureView />);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
            });

            await act(async () => {
                mockRec._fireResult('hello world');
            });

            expect(screen.getByRole('textbox')).toHaveValue('hello world');
        });

        it('appends to existing text with a space', async () => {
            const mockRec = makeMockRecognition();
            (window as unknown as Record<string, unknown>).SpeechRecognition = vi.fn(function () {
                return mockRec;
            });

            render(<CaptureView />);
            fireEvent.change(screen.getByRole('textbox'), { target: { value: 'existing' } });

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
            });

            await act(async () => {
                mockRec._fireResult('more text');
            });

            expect(screen.getByRole('textbox')).toHaveValue('existing more text');
        });

        it('stops recognition and returns to idle on second click', async () => {
            const mockRec = makeMockRecognition();
            (window as unknown as Record<string, unknown>).SpeechRecognition = vi.fn(function () {
                return mockRec;
            });

            render(<CaptureView />);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
            });

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));
            });

            expect(mockRec.stop).toHaveBeenCalledOnce();
            expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
        });

        it('returns to idle state when recognition ends naturally', async () => {
            const mockRec = makeMockRecognition();
            (window as unknown as Record<string, unknown>).SpeechRecognition = vi.fn(function () {
                return mockRec;
            });

            render(<CaptureView />);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
            });

            await act(async () => {
                mockRec._fireEnd();
            });

            expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
        });
    });
});
