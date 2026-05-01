import { Guild, TextChannel, Message, EmbedBuilder, ChannelType } from 'discord.js';

export class ManagementManager {
    private static LOG_CHANNEL_NAME = 'ai-actions-logs';

    private static async getLogChannel(guild: Guild): Promise<TextChannel> {
        let channel = guild.channels.cache.find(c => c.name === this.LOG_CHANNEL_NAME && c.isTextBased()) as TextChannel;
        if (!channel) {
            channel = await guild.channels.create({
                name: this.LOG_CHANNEL_NAME,
                reason: 'AI Server Management Logging',
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: ['ViewChannel']
                    }
                ]
            }) as TextChannel;
        }
        return channel;
    }

    public static async logAction(guild: Guild, action: string, target: string, reason: string, performer: string) {
        const logChannel = await this.getLogChannel(guild);
        const embed = new EmbedBuilder()
            .setTitle(`AI Action: ${action}`)
            .setColor('#FF0000')
            .addFields(
                { name: 'Target', value: target, inline: true },
                { name: 'Reason', value: reason, inline: true },
                { name: 'Performer', value: performer, inline: true }
            )
            .setTimestamp();
        await logChannel.send({ embeds: [embed] });
    }

    private static findChannel(guild: Guild, query: string) {
        return guild.channels.cache.get(query) || guild.channels.cache.find(c => c.name === query || c.name === query.replace('#', ''));
    }

    static async execute(message: Message, action: string, data: any): Promise<string> {
        const guild = message.guild!;
        const payload = data || {};
        const reason = payload.reason || 'No reason provided by AI Manager.';

        switch (action) {
            case 'warn': {
                const user = await guild.members.fetch(payload.userId).catch(() => null);
                if (!user) return `Failed to warn: User ${payload.userId} not found.`;
                await this.logAction(guild, 'WARN', user.user.tag, reason, message.author.tag);
                return `⚠️ **User Warned**: ${user.toString()} has been officially warned for: *${reason}*`;
            }
            case 'kick': {
                const member = await guild.members.fetch(payload.userId).catch(() => null);
                if (!member) return `Failed to kick: User ${payload.userId} not found.`;
                await member.kick(reason);
                await this.logAction(guild, 'KICK', member.user.tag, reason, message.author.tag);
                return `Successfully kicked **${member.user.tag}** for: *${reason}*`;
            }
            case 'ban': {
                const user = await guild.client.users.fetch(payload.userId).catch(() => null);
                if (!user) return `Failed to ban: User ${payload.userId} not found.`;
                await guild.members.ban(user, { reason });
                await this.logAction(guild, 'BAN', user.tag, reason, message.author.tag);
                return `Successfully banned **${user.tag}** for: *${reason}*`;
            }
            case 'purge': {
                const amount = parseInt(payload.amount);
                if (isNaN(amount) || amount < 1 || amount > 100) return `Failed to purge: Invalid amount (${payload.amount}).`;
                const deleted = await (message.channel as TextChannel).bulkDelete(amount, true);
                await this.logAction(guild, 'PURGE', `${deleted.size} messages in #${(message.channel as TextChannel).name}`, reason, message.author.tag);
                return `Successfully purged **${deleted.size}** messages for: *${reason}*`;
            }
            case 'slowmode': {
                const duration = parseInt(payload.duration);
                if (isNaN(duration)) return `Failed to set slowmode: Invalid duration.`;
                await (message.channel as TextChannel).setRateLimitPerUser(duration, reason);
                await this.logAction(guild, 'SLOWMODE', `Set to ${duration}s in #${(message.channel as TextChannel).name}`, reason, message.author.tag);
                return `Successfully set slowmode to **${duration}s** for: *${reason}*`;
            }
            case 'createRole': {
                const role = await guild.roles.create({ name: payload.name, color: payload.color, reason });
                await this.logAction(guild, 'CREATE_ROLE', role.name, reason, message.author.tag);
                return `Successfully created role **${role.name}** for: *${reason}*`;
            }
            case 'deleteRole': {
                const role = guild.roles.cache.get(payload.roleId);
                if (!role) return `Failed to delete role: ID ${payload.roleId} not found.`;
                await role.delete(reason);
                await this.logAction(guild, 'DELETE_ROLE', role.name, reason, message.author.tag);
                return `Successfully deleted role **${role.name}** for: *${reason}*`;
            }
            case 'setNickname': {
                const member = await guild.members.fetch(payload.userId).catch(() => null);
                if (!member) return `Failed to set nickname: User ${payload.userId} not found.`;
                await member.setNickname(payload.nickname, reason);
                await this.logAction(guild, 'SET_NICKNAME', `${member.user.tag} -> ${payload.nickname}`, reason, message.author.tag);
                return `Successfully changed **${member.user.tag}** nickname to **${payload.nickname}** for: *${reason}*`;
            }
            case 'sendMessage': {
                const channel = this.findChannel(guild, payload.channelId || payload.channelName) as TextChannel;
                if (!channel || !channel.isTextBased()) return `Failed to send message: Channel ${payload.channelId || payload.channelName} not found.`;
                await channel.send(payload.content);
                await this.logAction(guild, 'SEND_MESSAGE', `Message sent to #${channel.name}`, reason, message.author.tag);
                return `Successfully sent message to **#${channel.name}** for: *${reason}*`;
            }
            case 'setChannelTopic': {
                const channel = this.findChannel(guild, payload.channelId || payload.channelName || message.channelId) as TextChannel;
                if (!channel || !channel.setTopic) return `Failed to set topic: Invalid channel.`;
                await channel.setTopic(payload.topic, reason);
                await this.logAction(guild, 'SET_TOPIC', `Topic updated in #${channel.name}`, reason, message.author.tag);
                return `Successfully updated topic in **#${channel.name}** for: *${reason}*`;
            }
            case 'createChannel': {
                const channel = await guild.channels.create({
                    name: payload.name,
                    type: payload.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText,
                    reason
                });
                await this.logAction(guild, 'CREATE_CHANNEL', channel.name, reason, message.author.tag);
                return `Successfully created channel **#${channel.name}** for: *${reason}*`;
            }
            case 'deleteChannel': {
                const channel = this.findChannel(guild, payload.channelId || payload.channelName);
                if (!channel) return `Failed to delete channel: ${payload.channelId || payload.channelName} not found.`;
                const name = channel.name;
                await channel.delete(reason);
                await this.logAction(guild, 'DELETE_CHANNEL', name, reason, message.author.tag);
                return `Successfully deleted channel **#${name}** for: *${reason}*`;
            }
            default:
                return `AI attempted unknown action: ${action}`;
        }
    }
}
