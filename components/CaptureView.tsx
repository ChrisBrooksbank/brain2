'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { addNote } from '@/lib/db';
import { autoTagNote } from '@/lib/ai';
import { embedNote } from '@/lib/embeddings';

export default function CaptureView() {
    const [text, setText] = useState('');
    const [saved, setSaved] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [micError, setMicError] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    useEffect(() => {
        return () => {
            const rec = recognitionRef.current;
            recognitionRef.current = null;
            rec?.stop();
        };
    }, []);

    const handleSave = useCallback(async () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        const id = await addNote(trimmed);
        void autoTagNote(id, trimmed);
        void embedNote(id, trimmed);
        navigator.vibrate?.(10);
        setText('');
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
        textareaRef.current?.focus();
    }, [text]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSave();
            }
        },
        [handleSave],
    );

    const handleMic = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setMicError('Speech API not supported');
            return;
        }

        if (isListening) {
            const rec = recognitionRef.current;
            recognitionRef.current = null;
            rec?.stop();
            setIsListening(false);
            return;
        }

        setMicError('');

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onaudiostart = () => {
            setMicError('Listening...');
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                setText((prev) => (prev ? prev + ' ' + finalTranscript : finalTranscript));
                setMicError(`Got: "${finalTranscript}"`);
            }
        };

        recognition.onend = () => {
            // Auto-restart if still supposed to be listening
            if (recognitionRef.current === recognition) {
                try {
                    recognition.start();
                    return;
                } catch {
                    // fall through to stop
                }
            }
            setIsListening(false);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            if (event.error === 'no-speech') {
                // Ignore no-speech, onend will auto-restart
                return;
            }
            setMicError(`Mic error: ${event.error}`);
            recognitionRef.current = null;
            setIsListening(false);
        };

        try {
            recognitionRef.current = recognition;
            recognition.start();
            setIsListening(true);
        } catch (e) {
            recognitionRef.current = null;
            setMicError(`Start failed: ${e}`);
        }
    }, [isListening]);

    const isEmpty = text.trim().length === 0;

    return (
        <div className="flex h-full flex-col p-4 gap-3 animate-page-enter">
            <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What's on your mind?"
                className="flex-1 resize-none rounded-xl bg-card p-4 text-note text-primary placeholder-muted outline-none focus:ring-2 focus:ring-ring"
                aria-label="Note text"
            />
            <div className="flex items-center gap-3">
                <button
                    onClick={handleMic}
                    aria-label={isListening ? 'Stop recording' : 'Start recording'}
                    aria-pressed={isListening}
                    className={`min-h-[44px] min-w-[44px] rounded-xl text-xl transition-colors active:opacity-75 ${isListening ? 'bg-red-500 text-white' : 'bg-elevated text-secondary'}`}
                >
                    🎙
                </button>
                <button
                    onClick={handleSave}
                    disabled={isEmpty}
                    className="flex-1 min-h-[44px] rounded-xl bg-white text-black text-base font-semibold transition-opacity disabled:opacity-30 active:opacity-75"
                >
                    Save
                </button>
                {saved && (
                    <span className="text-sm text-faint animate-pulse" role="status">
                        Saved
                    </span>
                )}
                {micError && (
                    <span className="text-sm text-red-400">{micError}</span>
                )}
            </div>
        </div>
    );
}
