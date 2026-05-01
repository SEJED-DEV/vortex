import { Message, EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { Skill } from './Skill';

export const SecurityAuditor: Skill = {
    actionId: 'securityAudit',
    name: 'Security Auditor',
    description: 'Scans roles and channels for security vulnerabilities, dangerous permissions, and privacy leaks.',
    jsonStructure: '{"action": "securityAudit", "data": {}}',
    execute: async (message: Message, data: any): Promise<any> => {
        if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return "❌ Access Denied: Administrator permission required to run security audits.";
        }

        const guild = message.guild!;
        const vulnerabilities: string[] = [];

        // 1. Scan Roles for Dangerous Permissions
        guild.roles.cache.forEach(role => {
            if (role.name === '@everyone') return;
            
            const isDangerous = role.permissions.has(PermissionFlagsBits.Administrator) || 
                               role.permissions.has(PermissionFlagsBits.ManageGuild) ||
                               role.permissions.has(PermissionFlagsBits.ManageRoles);
            
            if (isDangerous && role.rawPosition < guild.roles.cache.size / 2) {
                vulnerabilities.push(`⚠️ **Dangerous Role**: \`${role.name}\` has administrative permissions but is positioned low in the hierarchy.`);
            }
        });

        // 2. Scan Channels for Privacy Leaks
        guild.channels.cache.forEach(channel => {
            if (channel.type !== ChannelType.GuildText) return;
            
            const sensitiveNames = ['staff', 'admin', 'log', 'mod', 'private', 'hidden', 'dev'];
            const isSensitive = sensitiveNames.some(name => channel.name.toLowerCase().includes(name));
            
            const everyonePermissions = channel.permissionsFor(guild.roles.everyone);
            const canEveryoneView = everyonePermissions?.has(PermissionFlagsBits.ViewChannel);

            if (isSensitive && canEveryoneView) {
                vulnerabilities.push(`🚨 **Privacy Leak**: Sensitive channel <#${channel.id}> is visible to \`@everyone\`.`);
            }
        });

        // 3. Scan for Bot Permissions & Rogue Bots
        await guild.members.fetch(); // Ensure all members are cached
        guild.members.cache.filter(m => m.user.bot).forEach(bot => {
            if (bot.id === message.client.user?.id) return;
            if (bot.permissions.has(PermissionFlagsBits.Administrator)) {
                vulnerabilities.push(`🤖 **Bot Admin**: <@${bot.id}> has \`Administrator\` permissions. Ensure this bot is trusted.`);
            }
        });

        const botMember = guild.members.me;
        if (botMember && !botMember.permissions.has(PermissionFlagsBits.Administrator)) {
            vulnerabilities.push(`ℹ️ **Optimizer Note**: Vortex does not have \`Administrator\` permissions. Some advanced management actions may fail.`);
        }

        // 4. Server MFA Level Check
        if (guild.mfaLevel === 0) { // 0 = NONE, 1 = ELEVATED
            vulnerabilities.push(`🔓 **2FA Disabled**: The server does NOT require Two-Factor Authentication for moderation actions. This is highly recommended to prevent nuke attacks.`);
        }

        // 5. Webhook Scans in Public Channels
        try {
            const webhooks = await guild.fetchWebhooks();
            webhooks.forEach(webhook => {
                if (!webhook.channelId) return;
                const channel = guild.channels.cache.get(webhook.channelId);
                if (channel && channel.type === ChannelType.GuildText) {
                    const everyonePermissions = channel.permissionsFor(guild.roles.everyone);
                    if (everyonePermissions?.has(PermissionFlagsBits.ViewChannel)) {
                        vulnerabilities.push(`🎣 **Exposed Webhook**: Webhook \`${webhook.name}\` exists in public channel <#${channel.id}>. If the URL is leaked, anyone can post as this webhook.`);
                    }
                }
            });
        } catch (e) {
            vulnerabilities.push(`⚠️ **Scan Error**: Vortex lacks permission to scan Webhooks (Requires \`ManageWebhooks\`).`);
        }

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Vortex Security Audit')
            .setColor(vulnerabilities.length > 0 ? '#FF0000' : '#00FF00')
            .setTimestamp()
            .setDescription(vulnerabilities.length > 0 
                ? `I found **${vulnerabilities.length}** potential security risks:\n\n${vulnerabilities.join('\n')}`
                : "✅ **No vulnerabilities detected.** Your server permissions are correctly configured.");

        return { embeds: [embed] };
    }
};

export default SecurityAuditor;
