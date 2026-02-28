'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { addNote } from '@/lib/db';

export default function CaptureView() {
    const [text, setText] = useState('');
    const [saved, setSaved] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    const handleSave = useCallback(async () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        await addNote(trimmed);
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
        if (!SpeechRecognition) return;

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const transcript = event.results[0][0].transcript;
            setText((prev) => (prev ? prev + ' ' + transcript : transcript));
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onerror = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    }, [isListening]);

    const isEmpty = text.trim().length === 0;

    return (
        <div className="flex h-full flex-col p-4 gap-3">
            <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What's on your mind?"
                className="flex-1 resize-none rounded-xl bg-neutral-900 p-4 text-base text-white placeholder-neutral-500 outline-none focus:ring-2 focus:ring-neutral-600"
                aria-label="Note text"
            />
            <div className="flex items-center gap-3">
                <button
                    onClick={handleMic}
                    aria-label={isListening ? 'Stop recording' : 'Start recording'}
                    aria-pressed={isListening}
                    className={`min-h-[44px] min-w-[44px] rounded-xl text-xl transition-colors ${isListening ? 'bg-red-500 text-white' : 'bg-neutral-800 text-neutral-300'}`}
                >
                    🎙
                </button>
                <button
                    onClick={handleSave}
                    disabled={isEmpty}
                    className="flex-1 min-h-[44px] rounded-xl bg-white text-black text-base font-semibold transition-opacity disabled:opacity-30"
                >
                    Save
                </button>
                {saved && (
                    <span className="text-sm text-neutral-400 animate-pulse" role="status">
                        Saved
                    </span>
                )}
            </div>
        </div>
    );
}
