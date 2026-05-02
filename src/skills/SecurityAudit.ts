import { EMBED_COLOR, EMBED_FOOTER_TEXT, BOT_NAME } from '../utils/Config';
import { Message, EmbedBuilder, PermissionsBitField } from 'discord.js';
import { Skill } from './Skill';
const SecurityAudit: Skill = {
  name: 'Security Audit Engine',
  description: 'Scans the server roles and permissions for potential security threats and misconfigurations.',
  actionId: 'auditSecurity',
  jsonStructure: '{"action": "auditSecurity", "data": {"reason": "Reason"}}',
  execute: async (message: Message, data: any) => {
    const guild = message.guild!;
    const report: string[] = [];
    const adminRoles = guild.roles.cache.filter((r) => r.permissions.has(PermissionsBitField.Flags.Administrator));
    report.push(`⚠️ **Admin Roles Found**: ${adminRoles.size} roles have Administrator permissions.`);
    const riskyEveryone =
      guild.roles.everyone.permissions.has(PermissionsBitField.Flags.MentionEveryone) ||
      guild.roles.everyone.permissions.has(PermissionsBitField.Flags.ManageMessages);
    if (riskyEveryone) {
      report.push(
        `🚨 **@everyone Alert**: The default role has risky permissions (Mention Everyone or Manage Messages)!`,
      );
    }
    const invitePermissions = guild.roles.cache.filter((r) =>
      r.permissions.has(PermissionsBitField.Flags.CreateInstantInvite),
    );
    report.push(`🔗 **Invite Access**: ${invitePermissions.size} roles can create server invites.`);
    const embed = new EmbedBuilder()
      .setTitle('🛡️ Vortex Security Audit Report')
      .setDescription(report.join('\n\n'))
      .setColor(EMBED_COLOR as any)
      .setFooter({ text: EMBED_FOOTER_TEXT })
      .setTimestamp();
    return { embeds: [embed] } as any;
  },
};
export default SecurityAudit;
