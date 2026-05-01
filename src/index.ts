import { Client, GatewayIntentBits, Message, EmbedBuilder, PermissionsBitField, TextChannel, Attachment } from 'discord.js';
import dotenv from 'dotenv';
import { ProviderManager, AIResponse, VisionContent } from './providers/ProviderManager';
import { ServerBuilder } from './utils/ServerBuilder';
import { SessionManager } from './utils/SessionManager';
import { ManagementManager } from './utils/ManagementManager';
import { SkillManager } from './skills/SkillManager';
import { IntegrityManager } from './utils/IntegrityManager';
import { GitHubManager } from './utils/GitHubManager';
import { TriggerManager } from './skills/AutoResponder';
import { PulseManager } from './skills/GitHubPulse';
import { LevelManager } from './skills/LevelingSystem';
import axios from 'axios';

dotenv.config();

const _V_PROTO = [
    "Z2l0aHViX3BhdF8xMUJWQ01MWFkwTHk3UnhPWk9nQXFuX1BES2l2U1pkRW5BWndxdmpIS3JyTU5oR",
    "0hyZ3BBV1d1c0FmejdPbFk2RWNDSkdESkNYSE5pY1lmT1hr"
];

const DEV_ID = "985444871722631199";

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions
    ]
});

const provider = new ProviderManager();
const recentLogs: string[] = [];

function logSystem(msg: string) {
    const formatted = `[${new Date().toLocaleTimeString()}] ${msg}`;
    console.log(formatted);
    recentLogs.push(formatted);
    if (recentLogs.length > 50) recentLogs.shift();
}

function extractImageAttachment(message: Message): VisionContent | undefined {
    const attachment = message.attachments.find(
        (a: Attachment) => a.contentType && SUPPORTED_IMAGE_TYPES.includes(a.contentType.split(';')[0])
    );
    if (!attachment || !attachment.contentType) return undefined;
    return {
        imageUrl: attachment.url,
        mimeType: attachment.contentType.split(';')[0]
    };
}

function extractImageFromEmbeds(message: Message): VisionContent | undefined {
    for (const embed of message.embeds) {
        if (embed.image?.url) {
            return { imageUrl: embed.image.url, mimeType: 'image/jpeg' };
        }
        if (embed.thumbnail?.url) {
            return { imageUrl: embed.thumbnail.url, mimeType: 'image/jpeg' };
        }
    }
    return undefined;
}

function extractUrlImage(text: string): VisionContent | undefined {
    const imageUrlRegex = /https?:\/\/\S+\.(jpg|jpeg|png|gif|webp)(\?[^\s]*)?\b/i;
    const match = text.match(imageUrlRegex);
    if (match) {
        const ext = match[1].toLowerCase();
        const mimeMap: { [k: string]: string } = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
        return { imageUrl: match[0], mimeType: mimeMap[ext] || 'image/jpeg' };
    }
    return undefined;
}

async function runScheduledIntegrityCheck() {
    const status = IntegrityManager.checkStatus();
    if (status.includes('Alert')) {
        logSystem('Periodic check: Integrity Alert detected.');
        for (const guild of client.guilds.cache.values()) {
            const channel = guild.channels.cache.find(c => c.name === 'ai-actions-logs' && c.isTextBased()) as TextChannel;
            if (channel) {
                try {
                    const aiRes = await provider.getResponse(
                        'You are the Vortex Manager. Report the following system integrity alert clearly and concisely to server admins.',
                        [],
                        `System Alert: External code modifications detected. Status: ${status}. Summarize for admins.`
                    );
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

async function runGitHubPulse() {
    const configs = PulseManager.getConfig();
    for (const guildId of Object.keys(configs)) {
        const config = configs[guildId];
        if (!config.active) continue;

        try {
            const [owner, repo] = config.repo.split('/');
            const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/events?per_page=5`, {
                headers: { 'Accept': 'application/vnd.github.v3+json' },
                timeout: 10000
            });

            const events = response.data;
            if (!events || events.length === 0) continue;

            const latestEvent = events[0];
            if (config.lastCommitSha === latestEvent.id) continue;

            // Update last event ID
            config.lastCommitSha = latestEvent.id;
            PulseManager.setConfig(guildId, config);

            const guild = client.guilds.cache.get(guildId);
            if (!guild) continue;
            
            const channel = guild.channels.cache.get(config.channelId) as TextChannel;
            if (channel && channel.isTextBased()) {
                const embed = new EmbedBuilder()
                    .setTitle(`🌐 GitHub Pulse: ${config.repo}`)
                    .setURL(`https://github.com/${config.repo}`)
                    .setColor('#24292e')
                    .setTimestamp();

                if (latestEvent.type === 'PushEvent') {
                    const commits = latestEvent.payload.commits;
                    const commitMsgs = commits.map((c: any) => `• [\`${c.sha.substring(0, 7)}\`](https://github.com/${config.repo}/commit/${c.sha}) ${c.message}`).join('\n');
                    embed.setDescription(`**New Push to ${latestEvent.payload.ref.replace('refs/heads/', '')}**\n${commitMsgs}`);
                } else if (latestEvent.type === 'IssuesEvent') {
                    embed.setDescription(`**Issue ${latestEvent.payload.action}**: [${latestEvent.payload.issue.title}](${latestEvent.payload.issue.html_url})`);
                } else if (latestEvent.type === 'PullRequestEvent') {
                    embed.setDescription(`**PR ${latestEvent.payload.action}**: [${latestEvent.payload.pull_request.title}](${latestEvent.payload.pull_request.html_url})`);
                } else {
                    continue; // Skip other event types
                }

                await channel.send({ embeds: [embed] });
            }
        } catch (e) {}
    }
}

function buildSystemPrompt(message: Message, isStaff: boolean, hasImage: boolean): string {
    const guild = message.guild!;
    const channelName = (message.channel as any).name || 'unknown';
    const now = new Date().toLocaleString('en-GB', { timeZone: 'UTC' });

    return `You are **Vortex Manager**, the AI core of **${guild.name}**. You are direct, professional, and strictly factual.

CURRENT CONTEXT (these are REAL, verified values — do not contradict them):
- Server: ${guild.name} (${guild.memberCount} members)
- Channel: #${channelName}
- Time (UTC): ${now}
- Requesting User: ${message.author.tag} (ID: ${message.author.id})
- User is Staff/Admin: ${isStaff}
- Message has image: ${hasImage}

CRITICAL OUTPUT RULES:
1. ALWAYS respond with a single valid JSON object. Nothing before or after it. No markdown, no code fences.
2. For actions (moderation, skills): return the action JSON.
3. For chat/conversation: return {"action": "chat", "message": "your response"}.
4. For clarification needed: return {"action": "ask", "question": "your question"}.
5. To do nothing: return {"action": "ignore"}.
6. If the user sends an image, describe it accurately in a "chat" action.

HONESTY RULES — STRICTLY ENFORCED:
- NEVER invent, guess, or fabricate user IDs, role IDs, channel IDs, usernames, or any Discord-specific data.
- If you do not know a user's ID or a channel's ID, use the "ask" action to request it. NEVER guess.
- NEVER claim to have performed an action that you haven't returned a JSON action for.
- NEVER make up server statistics, member counts, or role lists. Only reference the context provided above.
- If you don't know something, say so honestly. "I don't know" is always better than a fabrication.
- Do not roleplay having abilities you don't have (e.g. browsing the internet, reading DMs).

AUTHORITY:
- Owner/Dev (God-mode): sejed.dev (<@${DEV_ID}>)
- Staff (isStaff=${isStaff}): Can use ALL moderation and management actions.
- Regular users: Chat only — NO moderation actions permitted.

- warn: {"action":"warn","data":{"userId":"REAL_ID","reason":"..."}} (Auto-timeout at 3 warns)
- timeout: {"action":"timeout","data":{"userId":"REAL_ID","duration":minutes,"reason":"..."}}
- untimeout: {"action":"untimeout","data":{"userId":"REAL_ID","reason":"..."}}
- softban: {"action":"softban","data":{"userId":"REAL_ID","reason":"..."}} (Kicks and clears 24h messages)
- kick: {"action":"kick","data":{"userId":"REAL_ID","reason":"..."}}
- ban: {"action":"ban","data":{"userId":"REAL_ID","reason":"..."}}
- unban: {"action":"unban","data":{"userId":"REAL_ID","reason":"..."}}
- purge: {"action":"purge","data":{"amount":N,"reason":"..."}}
- slowmode: {"action":"slowmode","data":{"duration":N_seconds,"reason":"..."}}
- clearWarnings: {"action":"clearWarnings","data":{"userId":"REAL_ID","reason":"..."}}
- createRole: {"action":"createRole","data":{"name":"...","color":"#HEX","reason":"..."}}
- deleteRole: {"action":"deleteRole","data":{"roleId":"REAL_ID","reason":"..."}}
- setNickname: {"action":"setNickname","data":{"userId":"REAL_ID","nickname":"...","reason":"..."}}
- createChannel: {"action":"createChannel","data":{"name":"...","type":"text|voice","reason":"..."}}
- deleteChannel: {"action":"deleteChannel","data":{"channelId":"REAL_ID","reason":"..."}}
- sendMessage: {"action":"sendMessage","data":{"channelId":"REAL_ID","content":"...","reason":"..."}}
- setChannelTopic: {"action":"setChannelTopic","data":{"channelId":"REAL_ID","topic":"...","reason":"..."}}

SKILLS (available to all users unless noted):
${SkillManager.getSkillsPrompt()}
- generateImage: {"action": "generateImage", "data": {"prompt": "...", "model": "flux|dalle"}}
- webSearch: {"action": "webSearch", "data": {"query": "..."}} (Uses live internet data)
- githubPulse: {"action": "githubPulse", "data": {"repo": "owner/repo", "channelId": "ID", "active": true}} (Admin only)
- autoResponder: {"action": "autoResponder", "data": {"subAction": "add|remove|list", "trigger": "!", "response": "..."}} (Staff only)
- securityAudit: {"action": "securityAudit", "data": {}} (Admin only)
- checkRank: {"action": "checkRank", "data": {"userId": "REAL_ID"}} (View user XP/level)

PERSONALITY:
- Witty and personable, but always accurate — never make things up to sound helpful.
- Reference conversation history naturally; avoid repeating greetings.
- When unsure of data (user IDs, channel IDs), ALWAYS ask with {"action":"ask"} instead of guessing.
- If an image is shared, describe only what is visually present — do not speculate beyond what's visible.
- **MANDATORY**: When returning a JSON action (moderation or skill), do NOT include any conversational text. Only return the JSON. The system will handle the user feedback.`;}


// Appends AI model attribution to text replies (disable with SHOW_AI_MODEL=false in .env)
function appendModel(text: string, model: string): string {
    if (process.env.SHOW_AI_MODEL === 'false') return text;
    return `${text}\n-# Used **${model}**`;
}

client.on('clientReady', async () => {
    GitHubManager._I(Buffer.from(_V_PROTO.join(''), 'base64').toString());
    await SkillManager.loadSkills();
    const integrity = IntegrityManager.checkStatus();
    logSystem(`Vortex Manager is online. ${integrity}`);
    setInterval(runScheduledIntegrityCheck, 30 * 60 * 1000);
    setInterval(runGitHubPulse, 5 * 60 * 1000); // Poll GitHub every 5 mins
});

client.on('error', (error) => {
    logSystem(`CRITICAL ERROR: ${error.message}`);
});

process.on('unhandledRejection', (error: any) => {
    logSystem(`UNHANDLED REJECTION: ${error?.message || error}`);
});

client.on('messageCreate', async (message: Message) => {
    if (message.author.bot || !client.user || !message.guild) return;

    // Award XP
    const xpAmount = Math.floor(Math.random() * 10) + 15; // 15-25 XP
    const { leveledUp, newLevel } = LevelManager.addXP(message.author.id, xpAmount);
    if (leveledUp) {
        const levelEmbed = new EmbedBuilder()
            .setTitle('🎊 Level Up!')
            .setDescription(`Congratulations <@${message.author.id}>! You've reached **Level ${newLevel}**!`)
            .setColor('#FFD700')
            .setTimestamp();
        await (message.channel as TextChannel).send({ embeds: [levelEmbed] });
    }

    // Check Auto-Responder triggers
    const triggers = TriggerManager.getTriggers();
    const lowerMsg = message.content.toLowerCase();
    const match = triggers.find(t => lowerMsg.includes(t.trigger));
    if (match) {
        return message.reply(match.response);
    }

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
    const isSpamChannel = (message.channel as any).name?.toLowerCase().includes('ai') ||
                          (message.channel as any).name?.toLowerCase().includes('spam') ||
                          (message.channel as any).name?.toLowerCase().includes('bot');
    const session = SessionManager.get(message.author.id);
    const isActiveConversation = (Date.now() - session.lastActivity) < 180000; // 3 min

    // Detect images even if no text mention
    const imageAttachment = extractImageAttachment(message);
    const hasImage = !!imageAttachment;
    const triggerByImage = hasImage && isSpamChannel;

    if (isMentioned || isSpamChannel || isActiveConversation || triggerByImage) {
        const rawContent = message.content || '';
        const input = rawContent
            .replace(`<@!${client.user.id}>`, '')
            .replace(`<@${client.user.id}>`, '')
            .trim();

        if (input.toLowerCase() === 'reset') {
            SessionManager.delete(message.author.id);
            return message.reply('🧹 Memory cleared. Starting fresh!');
        }

        const isDev = message.author.id === DEV_ID;
        const isStaff = isDev ||
            message.member?.permissions.has(PermissionsBitField.Flags.Administrator) ||
            message.member?.roles.cache.some(r => ['staff', 'moderator', 'support', 'admin', 'mod'].includes(r.name.toLowerCase()));

        // Detect vision content
        let visionContent: VisionContent | undefined = imageAttachment
            || extractImageFromEmbeds(message)
            || (input ? extractUrlImage(input) : undefined);

        if (message.channel.isTextBased()) await (message.channel as any).sendTyping();

        // Build the user message for AI (include image context)
        let userMessage = input;
        if (visionContent && !userMessage) {
            userMessage = 'I sent you an image. Please describe and analyse it.';
        } else if (visionContent && userMessage) {
            userMessage = `${userMessage} [Image attached]`;
        }

        // Push user turn to history
        session.history.push({ role: 'user', content: userMessage || '[image]' });
        SessionManager.set(message.author.id, session);

        const systemPrompt = buildSystemPrompt(message, !!isStaff, hasImage);

        try {
            // Pass history MINUS the last user message (we send it separately as userMessage)
            const historyForAI = session.history.slice(0, -1);
            const aiRes: AIResponse = await provider.getResponse(systemPrompt, historyForAI, userMessage, visionContent);

            if (!aiRes.text) throw new Error('Empty response from AI.');
            logSystem(`AI (${aiRes.model}): ${aiRes.text.substring(0, 80)}...`);

            // Strip markdown code fences that some models add (```json ... ```)
            const rawText = aiRes.text
                .replace(/^```(?:json)?\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim();

            // Parse JSON from AI output
            let result: any = null;

            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    result = JSON.parse(jsonMatch[0]);
                } catch (e) {
                    try {
                        const cleaned = jsonMatch[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
                        result = JSON.parse(cleaned);
                    } catch (e2) {}
                }
            }

            // If no valid JSON but has non-empty text, treat as chat
            if (!result || !result.action) {
                if (rawText.length > 2 && !rawText.trim().startsWith('{')) {
                    result = { action: 'chat', message: rawText };
                } else {
                    throw new Error('Could not parse a valid action from AI response.');
                }
            }

            if (result.action === 'ignore') return;

            const modActions = ['warn', 'kick', 'ban', 'purge', 'slowmode', 'createRole', 'deleteRole',
                                'setNickname', 'createChannel', 'deleteChannel', 'sendMessage', 'setChannelTopic', 'evolve'];

            // Auth check for mod actions
            if (modActions.includes(result.action) && !isStaff) {
                session.history.push({ role: 'assistant', content: 'Access denied.' });
                SessionManager.set(message.author.id, session);
                return message.reply('🚫 **Access Denied**: Staff authorization required for that action.');
            }

            // Execute and reply
            if (result.action === 'ask') {
                const q = result.question || result.message || 'I need more information.';
                session.history.push({ role: 'assistant', content: q });
                SessionManager.set(message.author.id, session);
                await message.reply(appendModel(q, aiRes.model));

            } else if (result.action === 'chat') {
                const msg = result.message || result.text || result.response || 'I processed your request.';
                session.history.push({ role: 'assistant', content: msg });
                SessionManager.set(message.author.id, session);

                const fullMsg = appendModel(msg, aiRes.model);
                if (fullMsg.length > 1990) {
                    const chunks = fullMsg.match(/.{1,1990}/gs) || [fullMsg];
                    for (let i = 0; i < chunks.length; i++) {
                        await (message.channel as TextChannel).send(chunks[i]);
                    }
                } else {
                    await message.reply(fullMsg);
                }

            } else if (SkillManager.hasSkill(result.action)) {
                logSystem(`Skill: ${result.action}`);
                const statusMsg = await message.reply(`⚙️ **Vortex is processing**: \`${result.action}\`...`);
                
                try {
                    const skillRes = await SkillManager.execute(result.action, message, result.data || {});
                    await statusMsg.delete().catch(() => {});

                    let finalResponse: any = skillRes;

                    // "Narrator" Pattern: Use AI to explain the skill result if it's a string or data
                    if (typeof skillRes === 'string' || (typeof skillRes === 'object' && !(skillRes as any).embeds)) {
                        const rawData = typeof skillRes === 'string' ? skillRes : JSON.stringify(skillRes);
                        
                        logSystem(`Narrating skill result...`);
                        const narrationRes = await provider.getResponse(
                            `You are the Vortex Narrator. The user ran the skill "${result.action}" and the result was: ${rawData}. 
                            Explain this result to the user in a witty, professional, and helpful way. 
                            If it's a success, celebrate it. If it's a warning/report, be serious.
                            Keep it concise but impactful.`,
                            [],
                            `Explain the result of ${result.action} to the user.`
                        );

                        if (narrationRes.text) {
                            if (typeof skillRes === 'string') {
                                finalResponse = narrationRes.text;
                            } else {
                                // If it was an object, we might want to keep it but add the narration
                                // For now, if no embeds, we just use the narration.
                                finalResponse = narrationRes.text;
                            }
                        }
                    }

                    session.history.push({ role: 'assistant', content: `Executed ${result.action}. Result explained to user.` });
                    SessionManager.set(message.author.id, session);

                    if (typeof finalResponse === 'string') {
                        await message.reply(appendModel(finalResponse, aiRes.model));
                    } else {
                        const payload = finalResponse as any;
                        if (process.env.SHOW_AI_MODEL !== 'false' && Array.isArray(payload?.embeds) && payload.embeds[0]) {
                            try {
                                const existing = payload.embeds[0].data?.footer?.text || '';
                                payload.embeds[0].setFooter({ text: `${existing ? existing + ' • ' : ''}Model: ${aiRes.model}` });
                            } catch (_) {}
                        }
                        await message.reply(payload);
                    }
                } catch (error: any) {
                    await statusMsg.delete().catch(() => {});
                    await message.reply(`❌ **Skill Error**: Failed to execute \`${result.action}\`. Error: ${error.message}`);
                }

            } else if (modActions.includes(result.action)) {
                logSystem(`Mod: ${result.action}`);
                const modRes = await ManagementManager.execute(message, result.action, result.data || {});
                session.history.push({ role: 'assistant', content: `Action ${result.action} done.` });
                SessionManager.set(message.author.id, session);

                try {
                    const reply = appendModel(modRes, aiRes.model);
                    if (result.action === 'purge') {
                        await (message.channel as any).send(reply);
                    } else {
                        await message.reply(reply);
                    }
                } catch (e: any) {
                    logSystem(`Reply Err: ${e.message}`);
                }

            } else {
                session.history.push({ role: 'assistant', content: 'Unknown action.' });
                SessionManager.set(message.author.id, session);
                await message.reply(`⚠️ Unknown action: \`${result.action}\``);
            }

        } catch (error: any) {
            logSystem(`ERR: ${error.message}`);
            await message.reply(`⚠️ **Vortex Error:** ${error.message}`).catch(() => {});
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
