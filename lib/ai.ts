import { getConfig, updateNote } from '@/lib/db';

const API_KEY_CONFIG = 'anthropic_api_key';

export async function autoTagNote(noteId: number, text: string): Promise<void> {
    try {
        const apiKey = await getConfig(API_KEY_CONFIG);
        if (!apiKey) return;

        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 64,
                messages: [
                    {
                        role: 'user',
                        content: `Generate 2-4 lowercase tags for this note. Reply with only a JSON array of strings, no explanation.\n\nNote: ${text}`,
                    },
                ],
            }),
        });

        if (!res.ok) return;

        const data = (await res.json()) as { content?: { text?: string }[] };
        const content = data.content?.[0]?.text ?? '';
        const tags: unknown = JSON.parse(content);
        if (Array.isArray(tags) && tags.every((t) => typeof t === 'string')) {
            await updateNote(noteId, { tags: tags.map((t: string) => t.toLowerCase()) });
        }
    } catch {
        // fire-and-forget: silently ignore all errors
    }
}
