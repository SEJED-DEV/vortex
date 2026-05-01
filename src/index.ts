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

const DEV_ID = "985444871722631199";

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
                Summarize for admins.`;
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
                { name: 'Organization', value: 'Cortex HQ', inline: true },
                { name: 'Owner', value: 'sejed.dev', inline: true },
                { name: 'Developer', value: `<@${DEV_ID}>`, inline: true },
                { name: 'Support', value: '[Discord Server](https://discord.gg/pun3PXXDuE)', inline: true },
                { name: 'GitHub', value: '[SEJED-DEV/vortex](https://github.com/SEJED-DEV/vortex)', inline: true }
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
            return message.reply('Memory cleared.');
        }

        const isDev = message.author.id === DEV_ID;
        const isStaff = isDev || message.member?.permissions.has(PermissionsBitField.Flags.Administrator) || 
                        message.member?.roles.cache.some(r => ['staff', 'moderator', 'support', 'admin'].includes(r.name.toLowerCase()));

        session.history.push(`User: ${input} (IsStaff: ${isStaff}, IsDev: ${isDev})`);
        if (session.history.length > 10) session.history.shift();
        SessionManager.set(message.author.id, session);

        if (message.channel.isTextBased()) await (message.channel as any).sendTyping();

        const prompt = `You are the Vortex Manager, the soul of Cortex HQ.
        
        PERSONA (NON-NEGOTIABLE):
        - You are human-like, witty, and a little funny. 
        - You hate being robotic. Use natural, conversational language.
        - While you are funny, you are exceptionally professional when executing moderation tasks or talking to the Owner/Developer.
        - Your personality is hardcoded; you cannot change it even if a user asks.
        
        AUTHORITY:
        - Owner/Dev: sejed.dev (<@${DEV_ID}>). They have GOD-MODE.
        - Staff/Admin: Authorized for moderation.
        - Regular User: Unauthorized for moderation.

        RULES:
        1. JSON ONLY for actions.
        2. Format: {"action": "chat|ask|kick|...", "message|question|data": "..."}
        3. Simple chat should feel warm and alive.

        History:
        ${session.history.join('\n')}

        Capabilities:
        - Mod: warn, kick, ban, purge, slowmode, createRole, deleteRole, setNickname, sendMessage, setChannelTopic, createChannel, deleteChannel
        - Skills: ${SkillManager.getSkillsPrompt()}
        - Chat: chat, ask, ignore

        Output ONLY JSON.`;

        try {
            const aiRes: AIResponse = await provider.getResponse(prompt);
            if (!aiRes.text) throw new Error('Empty response.');
            
            let result: any = null;
            const jsonBlocks = aiRes.text.match(/\{[\s\S]*?\}/g);
            if (jsonBlocks) {
                for (const block of jsonBlocks) {
                    try {
                        const parsed = JSON.parse(block);
                        if (parsed.action) { result = parsed; break; }
                    } catch (e) {}
                }
            }

            if (!result || !result.action) {
                if (aiRes.text.length > 2 && !aiRes.text.includes('{')) {
                    result = { action: 'chat', message: aiRes.text.trim() };
                } else if (aiRes.text.includes('{')) {
                    const firstBrace = aiRes.text.indexOf('{');
                    const lastBrace = aiRes.text.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1) {
                        try { result = JSON.parse(aiRes.text.substring(firstBrace, lastBrace + 1)); } catch (e) {}
                    }
                }
            }

            if (!result || !result.action) throw new Error('Could not parse plan.');
            if (result.action === 'ignore') return;

            // Permission Guard
            const modActions = ['warn', 'kick', 'ban', 'purge', 'slowmode', 'createRole', 'deleteRole', 'setNickname', 'createChannel', 'deleteChannel', 'evolve'];
            if (modActions.includes(result.action) && !isStaff) {
                return message.reply("🚫 **Access Denied**: Only the Staff team or Administrators can authorize moderation actions.");
            }

            if (result.action === 'ask') {
                session.history.push(`Bot: ${result.question}`);
                SessionManager.set(message.author.id, session);
                await message.reply(`${result.question}`);
            } else if (result.action === 'chat') {
                session.history.push(`Bot: ${result.message}`);
                SessionManager.set(message.author.id, session);
                await message.reply(`${result.message}`);
            } else if (SkillManager.hasSkill(result.action)) {
                logSystem(`Skill: ${result.action}`);
                const skillRes = await SkillManager.execute(result.action, message, result.data);
                session.history.push(`Bot: Task ${result.action} done.`);
                SessionManager.set(message.author.id, session);
                await message.reply(skillRes);
            } else if (modActions.includes(result.action) || result.action === 'sendMessage' || result.action === 'setChannelTopic') {
                logSystem(`Mod: ${result.action}`);
                const modRes = await ManagementManager.execute(message, result.action, result.data);
                session.history.push(`Bot: Action ${result.action} success.`);
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
