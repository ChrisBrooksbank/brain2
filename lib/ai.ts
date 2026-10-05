import { db, getConfig, updateNote } from '@/lib/db';

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
        // Models often wrap the array in a ```json fence despite the instructions,
        // which would make JSON.parse throw and silently drop the tags.
        const json = content
            .trim()
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/, '');
        const tags: unknown = JSON.parse(json);
        if (Array.isArray(tags) && tags.every(t => typeof t === 'string')) {
            const aiTags = tags
                .map((t: string) => t.trim().replace(/^#/, '').toLowerCase())
                .filter(Boolean);
            const note = await db.notes.get(noteId);
            const existing = note?.tags ?? [];
            const merged = Array.from(new Set([...existing, ...aiTags]));
            await updateNote(noteId, { tags: merged });
        }
    } catch {
        // fire-and-forget: silently ignore all errors
    }
}
