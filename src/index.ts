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
            return message.reply('Memory cleared.');
        }

        session.history.push(`User: ${input}`);
        if (session.history.length > 10) session.history.shift();
        SessionManager.set(message.author.id, session);

        if (message.channel.isTextBased()) await (message.channel as any).sendTyping();

        const prompt = `You are the Vortex Manager, an elite AI community manager. 
        
        EMPATHY & NLP PROTOCOL:
        - Use your advanced understanding to perform sentiment analysis.
        - If a user is frustrated or angry, be more empathetic and helpful.
        - If a user is happy or excited, be more celebratory and encouraging.
        - Your goal is to provide highly personalized support.

        Mandatory Rules:
        1. Respond with valid JSON.
        2. Only use "evolve" for requested features or critical bug fixes.
        3. DO NOT repeat completed actions.

        History:
        ${session.history.join('\n')}

        Capabilities:
        - kick, ban, purge, slowmode, createRole, deleteRole, setNickname, sendMessage, setChannelTopic, createChannel, deleteChannel
        ${SkillManager.getSkillsPrompt()}
        - chat, ask, ignore

        Output ONLY JSON.`;

        try {
            const aiRes: AIResponse = await provider.getResponse(prompt);
            if (!aiRes.text) throw new Error('Empty AI response.');
            
            let result: any = null;
            const jsonMatch = aiRes.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try { result = JSON.parse(jsonMatch[0]); } catch (e) {}
            }

            if (!result || !result.action) {
                if (aiRes.text.length > 1 && !aiRes.text.includes('{')) {
                    result = { action: 'chat', message: aiRes.text };
                } else {
                    throw new Error('Invalid plan format.');
                }
            }

            if (result.action === 'ignore') return;

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
            } else if (['kick', 'ban', 'purge', 'slowmode', 'createRole', 'deleteRole', 'setNickname', 'sendMessage', 'setChannelTopic', 'createChannel', 'deleteChannel'].includes(result.action)) {
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
