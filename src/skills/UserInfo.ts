import { EMBED_COLOR, EMBED_FOOTER_TEXT, BOT_NAME } from '../utils/Config';
import { Message, EmbedBuilder, GuildMember } from 'discord.js';
import { Skill } from './Skill';
const UserInfo: Skill = {
  name: 'User Info',
  description: 'Fetches detailed information about a server member (join date, roles, status, account age)',
  actionId: 'userInfo',
  jsonStructure: '{"action": "userInfo", "data": {"userId": "USER_ID"}}',
  execute: async (message: Message, data: any): Promise<string> => {
    const guild = message.guild!;
    const userId = data?.userId || data?.user_id || message.author.id;
    const member: GuildMember | null = await guild.members.fetch(userId).catch(() => null);
    if (!member) return `❌ Could not find user with ID \`${userId}\` in this server.`;
    const user = member.user;
    const roles = member.roles.cache
      .filter((r) => r.id !== guild.roles.everyone.id)
      .sort((a, b) => b.position - a.position)
      .map((r) => r.toString())
      .slice(0, 10);
    const accountAge = Math.floor((Date.now() - user.createdTimestamp) / (1000 * 60 * 60 * 24));
    const joinAge = member.joinedTimestamp
      ? Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24))
      : 0;
    const embed = new EmbedBuilder()
      .setTitle(`👤 User Info: ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .setColor(member.displayHexColor || '#5865F2')
      .addFields(
        { name: '🆔 User ID', value: user.id, inline: true },
        { name: '🤖 Bot', value: user.bot ? 'Yes' : 'No', inline: true },
        {
          name: '📅 Account Created',
          value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R> (${accountAge} days ago)`,
          inline: false,
        },
        {
          name: '📥 Joined Server',
          value: member.joinedTimestamp
            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R> (${joinAge} days ago)`
            : 'Unknown',
          inline: false,
        },
        { name: '🎭 Display Name', value: member.displayName, inline: true },
        { name: `🎖️ Roles (${roles.length})`, value: roles.length > 0 ? roles.join(', ') : 'None', inline: false },
      )
      .setFooter({ text: `Requested by ${message.author.tag}` })
      .setTimestamp();
    return { embeds: [embed] } as any;
  },
};
export default UserInfo;
