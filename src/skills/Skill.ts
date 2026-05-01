import { Message } from 'discord.js';

export interface Skill {
    actionId: string;
    name: string;
    description: string;
    jsonStructure: string;
    execute: (message: Message, data: any) => Promise<string | any>;
}
