import { EMBED_COLOR, EMBED_FOOTER_TEXT, BOT_NAME } from '../utils/Config';
import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Skill } from './Skill';
import fs from 'fs';
import path from 'path';
interface Trigger {
  id: string;
  trigger: string;
  responses: string[];
  creatorId: string;
  isRegex: boolean;
}
export class TriggerManager {
  private static FILE_PATH = path.join(process.cwd(), 'data', 'triggers.json');
  public static cooldowns: Map<string, number> = new Map();
  private static init() {
    const dir = path.dirname(this.FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.FILE_PATH)) fs.writeFileSync(this.FILE_PATH, JSON.stringify([]));
  }
  public static getTriggers(): Trigger[] {
    this.init();
    const data = JSON.parse(fs.readFileSync(this.FILE_PATH, 'utf-8'));
    return data.map((t: any) => ({
      id: t.id,
      trigger: t.trigger,
      responses: Array.isArray(t.responses) ? t.responses : t.response ? [t.response] : ['No response'],
      creatorId: t.creatorId,
      isRegex: !!t.isRegex,
    }));
  }
  public static addTrigger(trigger: string, responseRaw: string, creatorId: string): void {
    const triggers = this.getTriggers();
    const isRegex = trigger.startsWith('/') && trigger.endsWith('/');
    const cleanTrigger = isRegex ? trigger.slice(1, -1) : trigger.toLowerCase();
    const responses = responseRaw.split('|').map((r) => r.trim());
    triggers.push({
      id: Math.random().toString(36).substring(2, 9),
      trigger: cleanTrigger,
      responses,
      creatorId,
      isRegex,
    });
    fs.writeFileSync(this.FILE_PATH, JSON.stringify(triggers, null, 2));
  }
  public static removeTrigger(trigger: string): boolean {
    const triggers = this.getTriggers();
    const cleanTrigger =
      trigger.startsWith('/') && trigger.endsWith('/') ? trigger.slice(1, -1) : trigger.toLowerCase();
    const initialLen = triggers.length;
    const filtered = triggers.filter((t) => t.trigger !== cleanTrigger);
    fs.writeFileSync(this.FILE_PATH, JSON.stringify(filtered, null, 2));
    return filtered.length < initialLen;
  }
}
export const AutoResponder: Skill = {
  actionId: 'autoResponder',
  name: 'Dynamic Auto-Responder',
  description: 'Manage custom triggers that the bot responds to automatically (e.g., !ip -> server ip).',
  jsonStructure:
    '{"action": "autoResponder", "data": {"subAction": "add|remove|list", "trigger": "phrase", "response": "text"}}',
  execute: async (message: Message, data: any): Promise<any> => {
    const { subAction, trigger, response } = data;
    const isStaff = message.member?.permissions.has(PermissionFlagsBits.ManageMessages);
    if (subAction === 'add') {
      if (!isStaff) return '❌ Only staff can add triggers.';
      if (!trigger || !response) return '❌ Trigger and response are required.';
      TriggerManager.addTrigger(trigger, response, message.author.id);
      return `✅ Successfully added trigger: \`${trigger}\``;
    }
    if (subAction === 'remove') {
      if (!isStaff) return '❌ Only staff can remove triggers.';
      if (!trigger) return '❌ Trigger phrase is required.';
      const success = TriggerManager.removeTrigger(trigger);
      return success ? `✅ Successfully removed trigger: \`${trigger}\`` : `❌ Trigger \`${trigger}\` not found.`;
    }
    if (subAction === 'list' || !subAction) {
      const triggers = TriggerManager.getTriggers();
      if (triggers.length === 0) return 'ℹ️ No auto-response triggers configured.';
      const embed = new EmbedBuilder()
        .setTitle('🤖 Auto-Response Triggers')
        .setColor(EMBED_COLOR as any)
        .setDescription(
          triggers
            .map((t) => {
              const displayTrigger = t.isRegex ? `/${t.trigger}/ (Regex)` : `"${t.trigger}"`;
              return `• **${displayTrigger}** — ${t.responses.length} response(s)`;
            })
            .join('\n'),
        )
        .setFooter({ text: `Total Triggers: ${triggers.length}` });
      return { embeds: [embed] };
    }
    return '❌ Invalid subAction. Use add, remove, or list.';
  },
};
export default AutoResponder;
