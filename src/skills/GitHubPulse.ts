import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Skill } from './Skill';
import fs from 'fs';
import path from 'path';
interface PulseConfig {
    repo: string;
    channelId: string;
    lastCommitSha?: string;
    active: boolean;
}
export class PulseManager {
    private static FILE_PATH = path.join(process.cwd(), 'data', 'pulse.json');
    private static init() {
        const dir = path.dirname(this.FILE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(this.FILE_PATH)) fs.writeFileSync(this.FILE_PATH, JSON.stringify({}));
    }
    public static getConfig(): Record<string, PulseConfig> {
        this.init();
        return JSON.parse(fs.readFileSync(this.FILE_PATH, 'utf-8'));
    }
    public static setConfig(guildId: string, config: PulseConfig): void {
        const configs = this.getConfig();
        configs[guildId] = config;
        fs.writeFileSync(this.FILE_PATH, JSON.stringify(configs, null, 2));
    }
}
export const GitHubPulse: Skill = {
    actionId: 'githubPulse',
    name: 'GitHub Pulse',
    description: 'Track a GitHub repository and post live updates about commits, issues, and PRs.',
    jsonStructure: '{"action": "githubPulse", "data": {"repo": "owner/repo", "channelId": "ID", "active": true}}',
    execute: async (message: Message, data: any): Promise<any> => {
        const { repo, channelId, active } = data;
        const isStaff = message.member?.permissions.has(PermissionFlagsBits.Administrator);
        if (!isStaff) return "❌ Only administrators can configure GitHub Pulse.";
        if (!repo) return "❌ Repository name (owner/repo) is required.";
        const guildId = message.guild!.id;
        const isSnowflake = /^\d{17,20}$/.test(String(channelId));
        const finalChannelId = isSnowflake ? String(channelId) : message.channel.id;
        PulseManager.setConfig(guildId, {
            repo,
            channelId: finalChannelId,
            active: active !== false
        });
        return `✅ **GitHub Pulse Activated** for \`${repo}\`! Updates will be posted in <#${finalChannelId}>.`;
    }
};
export default GitHubPulse;
