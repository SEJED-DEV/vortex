import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Skill } from './Skill';
import fs from 'fs';
import path from 'path';

interface Trigger {
    id: string;
    trigger: string;
    response: string;
    creatorId: string;
}

export class TriggerManager {
    private static FILE_PATH = path.join(process.cwd(), 'data', 'triggers.json');

    private static init() {
        const dir = path.dirname(this.FILE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(this.FILE_PATH)) fs.writeFileSync(this.FILE_PATH, JSON.stringify([]));
    }

    public static getTriggers(): Trigger[] {
        this.init();
        return JSON.parse(fs.readFileSync(this.FILE_PATH, 'utf-8'));
    }

    public static addTrigger(trigger: string, response: string, creatorId: string): void {
        const triggers = this.getTriggers();
        triggers.push({
            id: Math.random().toString(36).substr(2, 9),
            trigger: trigger.toLowerCase(),
            response,
            creatorId
        });
        fs.writeFileSync(this.FILE_PATH, JSON.stringify(triggers, null, 2));
    }

    public static removeTrigger(trigger: string): boolean {
        const triggers = this.getTriggers();
        const initialLen = triggers.length;
        const filtered = triggers.filter(t => t.trigger !== trigger.toLowerCase());
        fs.writeFileSync(this.FILE_PATH, JSON.stringify(filtered, null, 2));
        return filtered.length < initialLen;
    }
}

export const AutoResponder: Skill = {
    actionId: 'autoResponder',
    name: 'Dynamic Auto-Responder',
    description: 'Manage custom triggers that the bot responds to automatically (e.g., !ip -> server ip).',
    jsonStructure: '{"action": "autoResponder", "data": {"subAction": "add|remove|list", "trigger": "phrase", "response": "text"}}',
    execute: async (message: Message, data: any): Promise<any> => {
        const { subAction, trigger, response } = data;
        const isStaff = message.member?.permissions.has(PermissionFlagsBits.ManageMessages);

        if (subAction === 'add') {
            if (!isStaff) return "❌ Only staff can add triggers.";
            if (!trigger || !response) return "❌ Trigger and response are required.";
            TriggerManager.addTrigger(trigger, response, message.author.id);
            return `✅ Successfully added trigger: \`${trigger}\``;
        }

        if (subAction === 'remove') {
            if (!isStaff) return "❌ Only staff can remove triggers.";
            if (!trigger) return "❌ Trigger phrase is required.";
            const success = TriggerManager.removeTrigger(trigger);
            return success ? `✅ Successfully removed trigger: \`${trigger}\`` : `❌ Trigger \`${trigger}\` not found.`;
        }

        const triggers = TriggerManager.getTriggers();
        if (triggers.length === 0) return "ℹ️ No auto-response triggers configured.";

        const embed = new EmbedBuilder()
            .setTitle('🤖 Auto-Response Triggers')
            .setColor('#5865F2')
            .setDescription(triggers.map(t => `• **${t.trigger}**`).join('\n'))
            .setFooter({ text: `Total Triggers: ${triggers.length}` });

        return { embeds: [embed] };
    }
};

export default AutoResponder;
