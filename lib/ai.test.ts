import { describe, it, expect, vi, beforeEach } from 'vitest';
import { autoTagNote } from './ai';

vi.mock('@/lib/db', () => ({
    getConfig: vi.fn(),
    updateNote: vi.fn(),
}));

import { getConfig, updateNote } from '@/lib/db';
const mockGetConfig = vi.mocked(getConfig);
const mockUpdateNote = vi.mocked(updateNote);

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeResponse(ok: boolean, body: unknown) {
    return Promise.resolve({
        ok,
        json: () => Promise.resolve(body),
    });
}

beforeEach(() => {
    mockGetConfig.mockReset();
    mockUpdateNote.mockReset();
    mockFetch.mockReset();
});

describe('autoTagNote', () => {
    it('does nothing when no API key is set', async () => {
        mockGetConfig.mockResolvedValue(undefined);
        await autoTagNote(1, 'some text');
        expect(mockFetch).not.toHaveBeenCalled();
        expect(mockUpdateNote).not.toHaveBeenCalled();
    });

    it('calls the Anthropic API with the correct headers and note text', async () => {
        mockGetConfig.mockResolvedValue('sk-test-key');
        mockFetch.mockReturnValue(
            makeResponse(true, { content: [{ text: '["work","ideas"]' }] }),
        );
        mockUpdateNote.mockResolvedValue(undefined);

        await autoTagNote(42, 'my note text');

        expect(mockFetch).toHaveBeenCalledOnce();
        const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://api.anthropic.com/v1/messages');
        const headers = init.headers as Record<string, string>;
        expect(headers['x-api-key']).toBe('sk-test-key');
        expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
        const body = JSON.parse(init.body as string) as { messages: { content: string }[] };
        expect(body.messages[0].content).toContain('my note text');
    });

    it('updates the note with lowercase tags on success', async () => {
        mockGetConfig.mockResolvedValue('sk-test-key');
        mockFetch.mockReturnValue(
            makeResponse(true, { content: [{ text: '["Work","Ideas","TODO"]' }] }),
        );
        mockUpdateNote.mockResolvedValue(undefined);

        await autoTagNote(7, 'plan the project');

        expect(mockUpdateNote).toHaveBeenCalledOnce();
        expect(mockUpdateNote).toHaveBeenCalledWith(7, { tags: ['work', 'ideas', 'todo'] });
    });

    it('does not update the note when the API returns a non-ok status', async () => {
        mockGetConfig.mockResolvedValue('sk-test-key');
        mockFetch.mockReturnValue(makeResponse(false, {}));

        await autoTagNote(1, 'some text');

        expect(mockUpdateNote).not.toHaveBeenCalled();
    });

    it('does not throw when fetch rejects', async () => {
        mockGetConfig.mockResolvedValue('sk-test-key');
        mockFetch.mockRejectedValue(new Error('network error'));

        await expect(autoTagNote(1, 'some text')).resolves.toBeUndefined();
        expect(mockUpdateNote).not.toHaveBeenCalled();
    });

    it('does not throw when the response body is invalid JSON', async () => {
        mockGetConfig.mockResolvedValue('sk-test-key');
        mockFetch.mockReturnValue(
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ content: [{ text: 'not-json' }] }),
            }),
        );

        await expect(autoTagNote(1, 'some text')).resolves.toBeUndefined();
        expect(mockUpdateNote).not.toHaveBeenCalled();
    });

    it('does not update when the response tags are not an array of strings', async () => {
        mockGetConfig.mockResolvedValue('sk-test-key');
        mockFetch.mockReturnValue(
            makeResponse(true, { content: [{ text: '{"tags":["work"]}' }] }),
        );

        await autoTagNote(1, 'some text');

        expect(mockUpdateNote).not.toHaveBeenCalled();
    });
});
