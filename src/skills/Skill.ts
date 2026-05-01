import { Message } from 'discord.js';

export interface Skill {
    name: string;
    description: string;
    jsonStructure: string;
    actionId: string;
    execute: (message: Message, data: any) => Promise<string>;
}
