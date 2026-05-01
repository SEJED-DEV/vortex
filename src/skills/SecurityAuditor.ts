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

        // 3. Scan for Bot Permissions
        const botMember = guild.members.me;
        if (botMember && !botMember.permissions.has(PermissionFlagsBits.Administrator)) {
            vulnerabilities.push(`ℹ️ **Optimizer Note**: Vortex does not have \`Administrator\` permissions. Some advanced management actions may fail.`);
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
