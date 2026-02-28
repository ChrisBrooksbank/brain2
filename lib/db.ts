import Dexie, { type EntityTable } from 'dexie';

export interface Note {
    id: number;
    text: string;
    tags: string[];
    createdAt: Date;
    archived: boolean;
}

export interface Config {
    key: string;
    value: string;
}

class Brain2DB extends Dexie {
    notes!: EntityTable<Note, 'id'>;
    config!: EntityTable<Config, 'key'>;

    constructor() {
        super('brain2');
        this.version(1).stores({
            notes: '++id, text, *tags, createdAt, archived',
            config: 'key',
        });
    }
}

export const db = new Brain2DB();
