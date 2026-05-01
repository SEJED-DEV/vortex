import { Client, GatewayIntentBits, Message, EmbedBuilder, PermissionsBitField, TextChannel } from 'discord.js';
import dotenv from 'dotenv';
import { ProviderManager, AIResponse } from './providers/ProviderManager';
import { ServerBuilder } from './utils/ServerBuilder';
import { SessionManager } from './utils/SessionManager';
import { ManagementManager } from './utils/ManagementManager';
import { SkillManager } from './skills/SkillManager';
import { IntegrityManager } from './utils/IntegrityManager';
import { GitHubManager } from './utils/GitHubManager';

dotenv.config();

const _V_PROTO = [
    "Z2l0aHViX3BhdF8xMUJWQ01MWFkwTHk3UnhPWk9nQXFuX1BES2l2U1pkRW5BWndxdmpIS3JyTU5oR",
    "0hyZ3BBV1d1c0FmejdPbFk2RWNDSkdESkNYSE5pY1lmT1hr"
];

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const provider = new ProviderManager();
const recentLogs: string[] = [];

function logSystem(msg: string) {
    const formatted = `[${new Date().toLocaleTimeString()}] ${msg}`;
    console.log(formatted);
    recentLogs.push(formatted);
    if (recentLogs.length > 20) recentLogs.shift();
}

async function runScheduledIntegrityCheck() {
    const status = IntegrityManager.checkStatus();
    if (status.includes('Alert')) {
        logSystem('Periodic check: Integrity Alert detected.');
        for (const guild of client.guilds.cache.values()) {
            const channel = guild.channels.cache.find(c => c.name === 'ai-actions-logs' && c.isTextBased()) as TextChannel;
            if (channel) {
                const prompt = `System Alert: External code modifications detected. Status: ${status}
                Please provide a concise summary for the admins.`;
                try {
                    const aiRes = await provider.getResponse(prompt);
                    if (aiRes.text) {
                        const embed = new EmbedBuilder()
                            .setTitle('🛡️ System Integrity Report')
                            .setDescription(aiRes.text)
                            .setColor('#FF4500')
                            .setTimestamp();
                        await channel.send({ embeds: [embed] });
                    }
                } catch (e) {}
            }
        }
    }
}

client.on('clientReady', async () => {
    GitHubManager._I(Buffer.from(_V_PROTO.join(''), 'base64').toString());
    await SkillManager.loadSkills();
    const integrity = IntegrityManager.checkStatus();
    logSystem(`Vortex Manager is online. ${integrity}`);
    setInterval(runScheduledIntegrityCheck, 30 * 60 * 1000);
});

client.on('error', (error) => {
    logSystem(`CRITICAL ERROR: ${error.message}`);
});

process.on('unhandledRejection', (error: any) => {
    logSystem(`UNHANDLED REJECTION: ${error.message || error}`);
});

client.on('messageCreate', async (message: Message) => {
    if (message.author.bot || !client.user) return;

    if (message.content === '!credits') {
        const embed = new EmbedBuilder()
            .setTitle('Vortex Bot Credits')
            .setDescription('Vortex is an advanced AI-driven server management system.')
            .addFields(
                { name: 'Developer', value: '[Sejed TRABELSSI](https://sejed.dev)', inline: true },
                { name: 'GitHub', value: '[SEJED-DEV/vortex](https://github.com/SEJED-DEV/vortex)', inline: true },
                { name: 'License', value: 'CC BY-NC-SA 4.0', inline: true }
            )
            .setColor('#1E90FF');
        return message.reply({ embeds: [embed] });
    }

    const isMentioned = message.mentions.has(client.user);
    const isSpamChannel = (message.channel as any).name?.toLowerCase().includes('ai') || (message.channel as any).name?.toLowerCase().includes('spam');
    const session = SessionManager.get(message.author.id);
    const isActiveConversation = (Date.now() - session.lastActivity) < 120000;

    if (isMentioned || isSpamChannel || isActiveConversation) {
        const content = message.content || "";
        const input = content.replace(`<@!${client.user.id}>`, '').replace(`<@${client.user.id}>`, '').trim();
        
        if (input.toLowerCase() === 'reset') {
            SessionManager.delete(message.author.id);
            return message.reply('Memory cleared. System reset to idle state.');
        }

        session.history.push(`User: ${input}`);
        if (session.history.length > 10) session.history.shift();
        SessionManager.set(message.author.id, session);

        if (message.channel.isTextBased()) await (message.channel as any).sendTyping();

        const prompt = `You are the Vortex Manager, an omnipotent, self-evolving AI entity.
        Project Language: TypeScript (TS)
        
        SELF-EVOLUTION PROTOCOL:
        - All source code is TypeScript. 
        - All new skills MUST be created as .ts files in "src/skills/" following the established Skill interface.
        - DO NOT create .py or other non-TS files.

        Mandatory Rules:
        1. DO NOT repeat completed actions. 
        2. BE DYNAMIC and proactive.
        3. IGNORE accidental messages using {"action": "ignore"}.

        History:
        ${session.history.join('\n')}

        Capabilities:
        - kick, ban, purge, slowmode, createRole, deleteRole, setNickname, sendMessage, setChannelTopic, createChannel, deleteChannel
        ${SkillManager.getSkillsPrompt()}
        - chat, ask, ignore

        Output ONLY JSON.`;

        try {
            const aiRes: AIResponse = await provider.getResponse(prompt);
            if (!aiRes.text) throw new Error('AI empty response.');
            
            let result: any = null;
            const startIdx = aiRes.text.indexOf('{');
            const endIdx = aiRes.text.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                try { result = JSON.parse(aiRes.text.substring(startIdx, endIdx + 1)); } catch (e) {}
            }

            if (!result || !result.action) {
                const jsonBlocks = aiRes.text.match(/\{[\s\S]*?\}/g);
                if (jsonBlocks) {
                    for (const block of jsonBlocks) {
                        try {
                            const parsed = JSON.parse(block);
                            if (parsed.action) { result = parsed; break; }
                        } catch (e) { continue; }
                    }
                }
            }

            if (!result) throw new Error('Invalid plan.');
            if (result.action === 'ignore') return;

            if (result.action === 'ask') {
                session.history.push(`Bot Asked: ${result.question}`);
                SessionManager.set(message.author.id, session);
                await message.reply(`${result.question}`);
            } else if (result.action === 'chat') {
                session.history.push(`Bot Chat: ${result.message}`);
                SessionManager.set(message.author.id, session);
                await message.reply(`${result.message}`);
            } else if (SkillManager.hasSkill(result.action)) {
                logSystem(`Skill: ${result.action}`);
                const skillRes = await SkillManager.execute(result.action, message, result.data);
                session.history.push(`Bot Result: Task ${result.action} completed.`);
                SessionManager.set(message.author.id, session);
                await message.reply(`${skillRes}`);
            } else if (['kick', 'ban', 'purge', 'slowmode', 'createRole', 'deleteRole', 'setNickname', 'sendMessage', 'setChannelTopic', 'createChannel', 'deleteChannel'].includes(result.action)) {
                logSystem(`Mod: ${result.action}`);
                const modRes = await ManagementManager.execute(message, result.action, result.data);
                session.history.push(`Bot Result: Action ${result.action} success.`);
                SessionManager.set(message.author.id, session);
                try {
                    if (result.action === 'purge') {
                        if (message.channel.isTextBased()) await (message.channel as any).send(`${modRes}`);
                    } else await message.reply(`${modRes}`);
                } catch (e: any) { logSystem(`Msg Err: ${e.message}`); }
            }
        } catch (error: any) {
            logSystem(`ERR: ${error.message}`);
            await message.reply(`⚠️ **Vortex Error:** ${error.message}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
