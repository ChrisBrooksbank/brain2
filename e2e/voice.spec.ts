import { test, expect } from '@playwright/test';

// Only run on Chromium-based browsers (Speech API support)
test.describe('Voice transcription', () => {
    test.beforeEach(async ({ page, browserName }) => {
        test.skip(
            browserName !== 'chromium',
            'Speech Recognition only available in Chromium',
        );

        // Grant microphone permission
        await page.context().grantPermissions(['microphone']);

        // Inject a mock SpeechRecognition before the page loads
        await page.addInitScript(() => {
            class MockSpeechRecognition extends EventTarget {
                lang = '';
                interimResults = false;
                maxAlternatives = 1;
                onaudiostart: ((ev: Event) => void) | null = null;
                onresult: ((ev: Event) => void) | null = null;
                onend: ((ev: Event) => void) | null = null;
                onerror: ((ev: Event) => void) | null = null;

                start() {
                    // Fire audiostart after a short delay
                    setTimeout(() => {
                        this.onaudiostart?.(new Event('audiostart'));
                    }, 50);

                    // Store on window so tests can trigger events
                    (window as unknown as Record<string, unknown>).__mockRecognition = this;
                }

                stop() {
                    this.onend?.(new Event('end'));
                }

                abort() {
                    this.onend?.(new Event('end'));
                }
            }

            (window as unknown as Record<string, unknown>).SpeechRecognition =
                MockSpeechRecognition;
            (window as unknown as Record<string, unknown>).webkitSpeechRecognition =
                MockSpeechRecognition;
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('mic button exists and toggles listening state', async ({ page }) => {
        const micBtn = page.getByRole('button', { name: /start recording/i });
        await expect(micBtn).toBeVisible();

        // Click to start recording
        await micBtn.click();

        // Button should now say "Stop recording"
        const stopBtn = page.getByRole('button', { name: /stop recording/i });
        await expect(stopBtn).toBeVisible();

        // Should show "Listening..." feedback
        await expect(page.getByText('Listening...')).toBeVisible();

        // Click to stop
        await stopBtn.click();

        // Should return to "Start recording"
        await expect(
            page.getByRole('button', { name: /start recording/i }),
        ).toBeVisible();
    });

    test('transcript appears in textarea after speech recognition', async ({
        page,
    }) => {
        const micBtn = page.getByRole('button', { name: /start recording/i });
        await micBtn.click();

        // Wait for listening state
        await expect(
            page.getByRole('button', { name: /stop recording/i }),
        ).toBeVisible();

        // Simulate a speech recognition result from the mock
        await page.evaluate(() => {
            const rec = (
                window as unknown as Record<string, unknown>
            ).__mockRecognition as {
                onresult: ((ev: unknown) => void) | null;
            };
            rec.onresult?.({
                resultIndex: 0,
                results: {
                    0: { 0: { transcript: 'hello world' }, isFinal: true, length: 1 },
                    length: 1,
                },
            });
        });

        // Transcript should appear in the textarea
        const textarea = page.getByRole('textbox', { name: /note text/i });
        await expect(textarea).toHaveValue('hello world');
    });

    test('multiple transcripts append with spaces', async ({ page }) => {
        // Type some initial text
        const textarea = page.getByRole('textbox', { name: /note text/i });
        await textarea.fill('existing note');

        // Start listening
        await page.getByRole('button', { name: /start recording/i }).click();
        await expect(
            page.getByRole('button', { name: /stop recording/i }),
        ).toBeVisible();

        // Simulate first speech result
        await page.evaluate(() => {
            const rec = (
                window as unknown as Record<string, unknown>
            ).__mockRecognition as {
                onresult: ((ev: unknown) => void) | null;
            };
            rec.onresult?.({
                resultIndex: 0,
                results: {
                    0: {
                        0: { transcript: 'plus voice' },
                        isFinal: true,
                        length: 1,
                    },
                    length: 1,
                },
            });
        });

        await expect(textarea).toHaveValue('existing note plus voice');
    });

    test('transcribed text can be saved', async ({ page }) => {
        const micBtn = page.getByRole('button', { name: /start recording/i });
        await micBtn.click();

        await expect(
            page.getByRole('button', { name: /stop recording/i }),
        ).toBeVisible();

        // Simulate speech result
        await page.evaluate(() => {
            const rec = (
                window as unknown as Record<string, unknown>
            ).__mockRecognition as {
                onresult: ((ev: unknown) => void) | null;
            };
            rec.onresult?.({
                resultIndex: 0,
                results: {
                    0: {
                        0: { transcript: 'save this note' },
                        isFinal: true,
                        length: 1,
                    },
                    length: 1,
                },
            });
        });

        const textarea = page.getByRole('textbox', { name: /note text/i });
        await expect(textarea).toHaveValue('save this note');

        // Stop recording first
        await page
            .getByRole('button', { name: /stop recording/i })
            .click();

        // Save the note
        const saveBtn = page.getByRole('button', { name: /save/i });
        await expect(saveBtn).toBeEnabled();
        await saveBtn.click();

        // Textarea should be cleared after save
        await expect(textarea).toHaveValue('');

        // "Saved" confirmation should appear
        await expect(page.getByText('Saved')).toBeVisible();
    });

    test('shows error when speech API is unsupported', async ({
        page,
        browserName,
    }) => {
        test.skip(
            browserName !== 'chromium',
            'Only testing on Chromium',
        );

        // Create a fresh page without the mock
        const newPage = await page.context().newPage();
        await newPage.addInitScript(() => {
            delete (window as unknown as Record<string, unknown>)
                .SpeechRecognition;
            delete (window as unknown as Record<string, unknown>)
                .webkitSpeechRecognition;
        });
        await newPage.goto('/');
        await newPage.waitForLoadState('networkidle');

        await newPage
            .getByRole('button', { name: /start recording/i })
            .click();

        await expect(
            newPage.getByText('Speech API not supported'),
        ).toBeVisible();

        await newPage.close();
    });
});
