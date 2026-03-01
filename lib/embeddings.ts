import { db, putEmbedding, getAllEmbeddings } from './db';

type Pipeline = (texts: string[], options?: { pooling: string; normalize: boolean }) => Promise<{ tolist: () => number[][] }>;

let pipelinePromise: Promise<Pipeline> | null = null;

async function getPipeline(): Promise<Pipeline> {
    if (!pipelinePromise) {
        pipelinePromise = (async () => {
            const { pipeline } = await import('@huggingface/transformers');
            const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                dtype: 'fp32',
            });
            return pipe as unknown as Pipeline;
        })();
    }
    return pipelinePromise;
}

export async function generateEmbedding(text: string): Promise<number[]> {
    const pipe = await getPipeline();
    const output = await pipe([text], { pooling: 'mean', normalize: true });
    return output.tolist()[0];
}

export function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
    }
    return dot;
}

export async function embedNote(noteId: number, text: string): Promise<void> {
    try {
        const vector = await generateEmbedding(text);
        const note = await db.notes.get(noteId);
        if (!note) return;
        await putEmbedding(noteId, vector);
    } catch {
        // Silent failure — same pattern as autoTagNote
    }
}

export async function semanticSearch(
    query: string,
    topK: number = 10,
): Promise<{ noteId: number; score: number }[]> {
    const queryVector = await generateEmbedding(query);
    const embeddings = await getAllEmbeddings();

    const scored = embeddings
        .map((e) => ({ noteId: e.noteId, score: cosineSimilarity(queryVector, e.vector) }))
        .filter((r) => r.score >= 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    return scored;
}

async function embedNoteList(
    notes: { id: number; text: string }[],
    onProgress?: (done: number, total: number) => void,
): Promise<void> {
    for (let i = 0; i < notes.length; i++) {
        await embedNote(notes[i].id, notes[i].text);
        onProgress?.(i + 1, notes.length);
    }
}

export async function regenerateAllEmbeddings(
    onProgress?: (done: number, total: number) => void,
): Promise<void> {
    await db.embeddings.clear();
    const allNotes = await db.notes.toArray();
    await embedNoteList(allNotes, onProgress);
}

export async function embedAllUnembedded(
    onProgress?: (done: number, total: number) => void,
): Promise<void> {
    const allNotes = await db.notes.toArray();
    const allEmbeddings = await getAllEmbeddings();
    const embeddedIds = new Set(allEmbeddings.map((e) => e.noteId));
    const unembedded = allNotes.filter((n) => !embeddedIds.has(n.id));
    await embedNoteList(unembedded, onProgress);
}
