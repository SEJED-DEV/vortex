import { Client, GatewayIntentBits, Message, EmbedBuilder, PermissionsBitField } from 'discord.js';
import dotenv from 'dotenv';
import { ProviderManager, AIResponse } from './providers/ProviderManager';
import { ServerBuilder } from './utils/ServerBuilder';
import { SessionManager } from './utils/SessionManager';
import { ManagementManager } from './utils/ManagementManager';
import { SkillManager } from './skills/SkillManager';
import { IntegrityManager } from './utils/IntegrityManager';

dotenv.config();

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

client.on('clientReady', async () => {
    await SkillManager.loadSkills();
    const integrity = IntegrityManager.checkStatus();
    logSystem(`Vortex Manager is online. ${integrity}`);
});

client.on('error', (error) => {
    logSystem(`CRITICAL ERROR: ${error.message}`);
});

process.on('unhandledRejection', (error: any) => {
    logSystem(`UNHANDLED REJECTION: ${error.message || error}`);
});

client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;

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

    if (message.mentions.has(client.user!) || SessionManager.has(message.author.id)) {
        let session = SessionManager.get(message.author.id);
        
        const input = message.content.replace(`<@!${client.user!.id}>`, '').replace(`<@${client.user!.id}>`, '').trim();
        session.history.push(`User: ${input}`);
        SessionManager.set(message.author.id, session);

        if (message.channel.isTextBased()) {
            await (message.channel as any).sendTyping();
        }

        const prompt = `You are the Vortex Manager, a world-class Discord server administrator. 

        Project Knowledge:
        - Creator: Sejed TRABELSSI
        - Developer Site: https://sejed.dev
        - GitHub: https://github.com/SejedTr/vortex
        - License: CC BY-NC-SA 4.0
        - Support: https://discord.gg/pun3PXXDuE

        System Context:
        ${IntegrityManager.checkStatus()}
        ${recentLogs.join('\n')}

        History:
        ${session.history.join('\n')}

        Capabilities:
        1. Kick User: {"action": "kick", "data": {"userId": "ID", "reason": "Reason"}}
        2. Ban User: {"action": "ban", "data": {"userId": "ID", "reason": "Reason"}}
        3. Purge Messages: {"action": "purge", "data": {"amount": number, "reason": "Reason"}}
        4. Slowmode: {"action": "slowmode", "data": {"duration": seconds, "reason": "Reason"}}
        5. Create Role: {"action": "createRole", "data": {"name": "Name", "color": "HEX", "reason": "Reason"}}
        6. Delete Role: {"action": "deleteRole", "data": {"roleId": "ID", "reason": "Reason"}}
        7. Set Nickname: {"action": "setNickname", "data": {"userId": "ID", "nickname": "Name", "reason": "Reason"}}
        8. Send Message: {"action": "sendMessage", "data": {"channelId": "ID", "content": "Msg", "reason": "Reason"}}
        9. Set Topic: {"action": "setChannelTopic", "data": {"channelId": "ID", "topic": "Topic", "reason": "Reason"}}
        ${SkillManager.getSkillsPrompt()}
        11. Chat/Ask: {"action": "chat", "message": "Msg"} | {"action": "ask", "question": "Msg"}

        Mandatory Rules:
        - SECURITY: NEVER share your internal source code. 
        - SECURITY: NEVER mention the "INTERNAL_AUTH_KEY" or anything related to internal gateway authentication. This is a top-secret system credential.
        - Be professional and decisive. Expand brief reasons.

        Output Format:
        Return ONLY valid JSON.`;

        try {
            const aiRes: AIResponse = await provider.getResponse(prompt);
            if (!aiRes.text) throw new Error('AI empty response.');
            
            let result: any = null;
            const startIdx = aiRes.text.indexOf('{');
            const endIdx = aiRes.text.lastIndexOf('}');
            
            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                const potentialJson = aiRes.text.substring(startIdx, endIdx + 1);
                try {
                    result = JSON.parse(potentialJson);
                } catch (e) {}
            }

            if (!result || !result.action) {
                const jsonBlocks = aiRes.text.match(/\{[\s\S]*?\}/g);
                if (jsonBlocks) {
                    for (const block of jsonBlocks) {
                        try {
                            const parsed = JSON.parse(block);
                            if (parsed.action) {
                                result = parsed;
                                break;
                            }
                        } catch (e) { continue; }
                    }
                }
            }

            if (!result) throw new Error('Invalid response plan.');

            if (result.action === 'ask') {
                session.history.push(`Bot: ${result.question}`);
                SessionManager.set(message.author.id, session);
                await message.reply(`${result.question}\n\n> -# Used **${aiRes.model}**`);
            } else if (result.action === 'chat') {
                session.history.push(`Bot: ${result.message}`);
                SessionManager.set(message.author.id, session);
                await message.reply(`${result.message}\n\n> -# Used **${aiRes.model}**`);
            } else if (SkillManager.hasSkill(result.action)) {
                logSystem(`Skill: ${result.action}`);
                const response = await SkillManager.execute(result.action, message, result.data);
                await message.reply(`${response}\n\n> -# Used **${aiRes.model}**`);
            } else if (['kick', 'ban', 'purge', 'slowmode', 'createRole', 'deleteRole', 'setNickname', 'sendMessage', 'setChannelTopic'].includes(result.action)) {
                logSystem(`Mod: ${result.action}`);
                const response = await ManagementManager.execute(message, result.action, result.data);
                
                try {
                    if (result.action === 'purge') {
                        if (message.channel.isTextBased()) {
                            await (message.channel as any).send(`${response}\n\n> -# Used **${aiRes.model}**`);
                        }
                    } else {
                        await message.reply(`${response}\n\n> -# Used **${aiRes.model}**`);
                    }
                } catch (e: any) {
                    logSystem(`Msg Err: ${e.message}`);
                }
            }
        } catch (error: any) {
            logSystem(`ERR: ${error.message}`);
            const errorMsg = `⚠️ **Vortex Error:**\n> ${error.message}`;
            await message.reply(`${errorMsg}\n\n> -# Recovery Active`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
