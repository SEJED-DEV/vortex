import { Guild, TextChannel, Message, EmbedBuilder, ChannelType, User, GuildMember } from 'discord.js';
import { WarnManager } from './WarnManager';
import { BOT_NAME } from './Config';
export class ManagementManager {
  private static LOG_CHANNEL_NAME = 'ai-actions-logs';
  private static async getLogChannel(guild: Guild): Promise<TextChannel> {
    let channel = guild.channels.cache.find((c) => c.name === this.LOG_CHANNEL_NAME && c.isTextBased()) as TextChannel;
    if (!channel) {
      channel = (await guild.channels.create({
        name: this.LOG_CHANNEL_NAME,
        reason: 'AI Server Management Logging',
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: ['ViewChannel'],
          },
        ],
      })) as TextChannel;
    }
    return channel;
  }
  public static async logAction(guild: Guild, action: string, target: string, reason: string, performer: string) {
    try {
      const logChannel = await this.getLogChannel(guild);

      let color = '#7289DA';
      let icon = 'ℹ️';

      if (action.includes('BAN')) {
        color = '#FF004D';
        icon = '🔨';
      } else if (action.includes('KICK')) {
        color = '#FF4500';
        icon = '👢';
      } else if (action.includes('WARN')) {
        color = '#FFA500';
        icon = '⚠️';
      } else if (action.includes('TIMEOUT')) {
        color = '#FFD700';
        icon = '🔇';
      } else if (action.includes('CREATE')) {
        color = '#00FF7F';
        icon = '➕';
      } else if (action.includes('DELETE')) {
        color = '#DC143C';
        icon = '➖';
      }

      const embed = new EmbedBuilder()
        .setTitle(`${icon} System Log: ${action.replace('_', ' ')}`)
        .setColor(color as any)
        .setDescription(`The **${BOT_NAME} Engine** has recorded a new management event.`)
        .addFields(
          { name: '👤 Target', value: `\`${target}\``, inline: true },
          { name: '🛠️ Performer', value: `\`${performer}\``, inline: true },
          { name: '📝 Reason', value: `*${reason || 'No reason provided.'}*`, inline: false },
        )
        .setFooter({
          text: `Engine ID: ${guild.id} | ${BOT_NAME} V1.5`,
          iconURL: guild.client.user?.displayAvatarURL(),
        })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (e) {}
  }
  private static findChannel(guild: Guild, query: string | undefined) {
    if (!query || typeof query !== 'string') return null;
    const cleaned = query.replace('#', '').trim();
    return guild.channels.cache.get(cleaned) || guild.channels.cache.find((c) => c.name === cleaned);
  }
  private static async notifyUser(target: GuildMember | User, action: string, reason: string, guild: Guild) {
    try {
      const embed = new EmbedBuilder()
        .setAuthor({ name: `${BOT_NAME} Security System`, iconURL: guild.client.user?.displayAvatarURL() })
        .setTitle(`🚨 Moderation Notice`)
        .setDescription(
          `This is an automated notification regarding an action taken on your account in **${guild.name}**.`,
        )
        .setColor('#FF004D')
        .addFields(
          { name: '📌 Action Taken', value: `\`${action.toUpperCase()}\``, inline: true },
          { name: '⚖️ Reason', value: reason, inline: true },
        )
        .setFooter({ text: 'If you believe this was an error, please contact server administrators.' })
        .setTimestamp();
      await target.send({ embeds: [embed] }).catch(() => {});
    } catch (e) {}
  }
  static async execute(message: Message, action: string, data: any): Promise<string> {
    const guild = message.guild!;
    const payload = data && typeof data === 'object' ? data : {};
    const reason =
      typeof payload.reason === 'string' && payload.reason.trim()
        ? payload.reason.trim()
        : 'No reason provided by AI Manager.';
    try {
      switch (action) {
        case 'warn': {
          const userId = payload.userId || payload.user_id;
          if (!userId) return `Failed to warn: No user ID provided.`;
          const member = await guild.members.fetch(userId).catch(() => null);
          if (!member) return `Failed to warn: User ${userId} not found.`;
          const count = await WarnManager.addWarning(member.id, message.author.id, reason);
          await this.logAction(guild, 'WARN', member.user.tag, reason, message.author.tag);
          await this.notifyUser(member, 'Warning', reason, guild);
          let extra = '';
          if (count >= 3) {
            await member.timeout(1000 * 60 * 60, 'Auto-timeout for reaching 3 warnings').catch(() => {});
            await this.notifyUser(member, 'Automatic Timeout (3 warnings)', 'Reached warning threshold.', guild);
            extra = `\n🚨 **Threshold reached**: User has been automatically timed out for 1 hour.`;
          }
          return `⚠️ **User Warned**: ${member.toString()} has been officially warned (**${count}/3**). Reason: *${reason}*${extra}`;
        }
        case 'timeout': {
          const userId = payload.userId || payload.user_id;
          const duration = parseInt(payload.duration) || 60;
          if (!userId) return `Failed to timeout: No user ID provided.`;
          const member = await guild.members.fetch(userId).catch(() => null);
          if (!member) return `Failed to timeout: User ${userId} not found.`;
          await this.notifyUser(member, `Timeout (${duration}m)`, reason, guild);
          await member.timeout(duration * 60 * 1000, reason);
          await this.logAction(guild, 'TIMEOUT', member.user.tag, `${duration}m: ${reason}`, message.author.tag);
          return `🔇 **Timed out** **${member.user.tag}** for **${duration} minutes**. Reason: *${reason}*`;
        }
        case 'untimeout': {
          const userId = payload.userId || payload.user_id;
          if (!userId) return `Failed to unmute: No user ID provided.`;
          const member = await guild.members.fetch(userId).catch(() => null);
          if (!member) return `Failed to unmute: User ${userId} not found.`;
          await member.timeout(null, reason);
          await this.logAction(guild, 'UNTIMEOUT', member.user.tag, reason, message.author.tag);
          return `🔊 **Untimed out** **${member.user.tag}**. Reason: *${reason}*`;
        }
        case 'softban': {
          const userId = payload.userId || payload.user_id;
          if (!userId) return `Failed to softban: No user ID provided.`;
          const member = await guild.members.fetch(userId).catch(() => null);
          if (!member) return `Failed to softban: User ${userId} not found.`;
          const tag = member.user.tag;
          await this.notifyUser(member, 'Softban', reason, guild);
          await guild.members.ban(member, { reason: `Softban: ${reason}`, deleteMessageSeconds: 60 * 60 * 24 });
          await guild.members.unban(member.id, 'Softban completion');
          await this.logAction(guild, 'SOFTBAN', tag, reason, message.author.tag);
          return `🔨 **Softbanned** **${tag}** (Kicked and messages cleared). Reason: *${reason}*`;
        }
        case 'kick': {
          const userId = payload.userId || payload.user_id;
          if (!userId) return `Failed to kick: No user ID provided.`;
          const member = await guild.members.fetch(userId).catch(() => null);
          if (!member) return `Failed to kick: User ${userId} not found.`;
          await this.notifyUser(member, 'Kick', reason, guild);
          await member.kick(reason);
          await this.logAction(guild, 'KICK', member.user.tag, reason, message.author.tag);
          return `Successfully kicked **${member.user.tag}** for: *${reason}*`;
        }
        case 'ban': {
          const userId = payload.userId || payload.user_id;
          if (!userId) return `Failed to ban: No user ID provided.`;
          const user = await guild.client.users.fetch(userId).catch(() => null);
          if (!user) return `Failed to ban: User ${userId} not found.`;
          await this.notifyUser(user, 'Ban', reason, guild);
          await guild.members.ban(user, { reason });
          await this.logAction(guild, 'BAN', user.tag, reason, message.author.tag);
          return `Successfully banned **${user.tag}** for: *${reason}*`;
        }
        case 'unban': {
          const userId = payload.userId || payload.user_id;
          if (!userId) return `Failed to unban: No user ID provided.`;
          await guild.members.unban(userId, reason);
          await this.logAction(guild, 'UNBAN', userId, reason, message.author.tag);
          return `✅ **Unbanned** user ID \`${userId}\`. Reason: *${reason}*`;
        }
        case 'purge': {
          const amount = parseInt(payload.amount);
          if (isNaN(amount) || amount < 1 || amount > 100)
            return `Failed to purge: Invalid amount (${payload.amount}). Use 1-100.`;
          const deleted = await (message.channel as TextChannel).bulkDelete(amount, true);
          await this.logAction(
            guild,
            'PURGE',
            `${deleted.size} messages in #${(message.channel as TextChannel).name}`,
            reason,
            message.author.tag,
          );
          return `Successfully purged **${deleted.size}** messages for: *${reason}*`;
        }
        case 'slowmode': {
          const duration = parseInt(payload.duration);
          if (isNaN(duration)) return `Failed to set slowmode: Invalid duration.`;
          await (message.channel as TextChannel).setRateLimitPerUser(duration, reason);
          await this.logAction(
            guild,
            'SLOWMODE',
            `Set to ${duration}s in #${(message.channel as TextChannel).name}`,
            reason,
            message.author.tag,
          );
          return `Successfully set slowmode to **${duration}s** for: *${reason}*`;
        }
        case 'clearWarnings': {
          const userId = payload.userId || payload.user_id;
          if (!userId) return `Failed to clear warnings: No user ID provided.`;
          WarnManager.clearWarnings(userId);
          await this.logAction(guild, 'CLEAR_WARNS', userId, reason, message.author.tag);
          return `✨ **Warnings cleared** for user ID \`${userId}\`.`;
        }
        case 'createRole': {
          const roleName = payload.name || payload.roleName;
          if (!roleName) return `Failed to create role: No role name provided.`;
          const role = await guild.roles.create({ name: roleName, color: payload.color || '#99AAB5', reason });
          await this.logAction(guild, 'CREATE_ROLE', role.name, reason, message.author.tag);
          return `Successfully created role **${role.name}** for: *${reason}*`;
        }
        case 'deleteRole': {
          const roleId = payload.roleId || payload.role_id;
          if (!roleId) return `Failed to delete role: No role ID provided.`;
          const role = guild.roles.cache.get(roleId);
          if (!role) return `Failed to delete role: ID ${roleId} not found.`;
          await role.delete(reason);
          await this.logAction(guild, 'DELETE_ROLE', role.name, reason, message.author.tag);
          return `Successfully deleted role **${role.name}** for: *${reason}*`;
        }
        case 'setNickname': {
          const userId = payload.userId || payload.user_id;
          const nickname = payload.nickname || payload.nick;
          if (!userId) return `Failed to set nickname: No user ID provided.`;
          const member = await guild.members.fetch(userId).catch(() => null);
          if (!member) return `Failed to set nickname: User ${userId} not found.`;
          await member.setNickname(nickname || null, reason);
          await this.logAction(guild, 'SET_NICKNAME', `${member.user.tag} -> ${nickname}`, reason, message.author.tag);
          return `Successfully changed **${member.user.tag}** nickname to **${nickname}** for: *${reason}*`;
        }
        case 'sendMessage': {
          const query = payload.channelId || payload.channelName || payload.channel;
          const channel = (query ? this.findChannel(guild, String(query)) : message.channel) as TextChannel;
          if (!channel || !channel.isTextBased()) return `Failed to send message: Channel not found.`;
          const content = payload.content || payload.message || payload.text;
          if (!content || typeof content !== 'string') return `Failed to send message: No content provided.`;
          await channel.send(content);
          await this.logAction(guild, 'SEND_MESSAGE', `#${channel.name}`, reason, message.author.tag);
          return `Successfully sent message to **#${channel.name}** for: *${reason}*`;
        }
        case 'setChannelTopic': {
          const query = payload.channelId || payload.channelName || payload.channel;
          const channel = (query ? this.findChannel(guild, String(query)) : message.channel) as TextChannel;
          if (!channel || typeof (channel as any).setTopic !== 'function') return `Failed to set topic: Invalid channel.`;
          const topic = payload.topic || payload.description;
          if (!topic || typeof topic !== 'string') return `Failed to set topic: No topic provided.`;
          await (channel as any).setTopic(topic, reason);
          await this.logAction(guild, 'SET_TOPIC', `#${channel.name}`, reason, message.author.tag);
          return `Successfully updated topic in **#${channel.name}** for: *${reason}*`;
        }
        case 'createChannel': {
          const chanName = payload.name || payload.channelName;
          if (!chanName) return `Failed to create channel: No channel name provided.`;
          const channel = await guild.channels.create({
            name: chanName,
            type: payload.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText,
            reason,
          });
          await this.logAction(guild, 'CREATE_CHANNEL', channel.name, reason, message.author.tag);
          return `Successfully created channel **#${channel.name}** for: *${reason}*`;
        }
        case 'deleteChannel': {
          const query = payload.channelId || payload.channelName || payload.channel;
          const channel = this.findChannel(guild, String(query || ''));
          if (!channel) return `Failed to delete channel: Channel not found.`;
          const name = channel.name;
          await channel.delete(reason);
          await this.logAction(guild, 'DELETE_CHANNEL', name, reason, message.author.tag);
          return `Successfully deleted channel **#${name}** for: *${reason}*`;
        }
        default:
          return `AI attempted unknown action: ${action}`;
      }
    } catch (error: any) {
      if (error.message.includes('Missing Permissions')) {
        return `Failed to execute ${action}: Missing Permissions. The bot role must be higher than the target and have the necessary administrative rights.`;
      }
      return `Failed to execute ${action}: ${error.message}`;
    }
  }
}
