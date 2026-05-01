import { Guild, TextChannel, Message, EmbedBuilder } from 'discord.js';

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
            });
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

    static async execute(message: Message, action: string, data: any): Promise<string> {
        const guild = message.guild!;
        const reason = data.reason || 'No reason provided by AI Architect.';

        switch (action) {
            case 'kick': {
                const member = await guild.members.fetch(data.userId).catch(() => null);
                if (!member) return `Failed to kick: User ${data.userId} not found.`;
                await member.kick(reason);
                await this.logAction(guild, 'KICK', member.user.tag, reason, message.author.tag);
                return `Successfully kicked **${member.user.tag}** for: *${reason}*`;
            }
            case 'ban': {
                const user = await guild.client.users.fetch(data.userId).catch(() => null);
                if (!user) return `Failed to ban: User ${data.userId} not found.`;
                await guild.members.ban(user, { reason });
                await this.logAction(guild, 'BAN', user.tag, reason, message.author.tag);
                return `Successfully banned **${user.tag}** for: *${reason}*`;
            }
            case 'purge': {
                const amount = parseInt(data.amount);
                if (isNaN(amount) || amount < 1 || amount > 100) return `Failed to purge: Invalid amount (${data.amount}).`;
                const deleted = await (message.channel as TextChannel).bulkDelete(amount, true);
                await this.logAction(guild, 'PURGE', `${deleted.size} messages in #${(message.channel as TextChannel).name}`, reason, message.author.tag);
                return `Successfully purged **${deleted.size}** messages for: *${reason}*`;
            }
            case 'slowmode': {
                const duration = parseInt(data.duration);
                if (isNaN(duration)) return `Failed to set slowmode: Invalid duration.`;
                await (message.channel as TextChannel).setRateLimitPerUser(duration, reason);
                await this.logAction(guild, 'SLOWMODE', `Set to ${duration}s in #${(message.channel as TextChannel).name}`, reason, message.author.tag);
                return `Successfully set slowmode to **${duration}s** for: *${reason}*`;
            }
            case 'createRole': {
                const role = await guild.roles.create({ name: data.name, color: data.color, reason });
                await this.logAction(guild, 'CREATE_ROLE', role.name, reason, message.author.tag);
                return `Successfully created role **${role.name}** for: *${reason}*`;
            }
            case 'deleteRole': {
                const role = guild.roles.cache.get(data.roleId);
                if (!role) return `Failed to delete role: ID ${data.roleId} not found.`;
                await role.delete(reason);
                await this.logAction(guild, 'DELETE_ROLE', role.name, reason, message.author.tag);
                return `Successfully deleted role **${role.name}** for: *${reason}*`;
            }
            case 'setNickname': {
                const member = await guild.members.fetch(data.userId).catch(() => null);
                if (!member) return `Failed to set nickname: User ${data.userId} not found.`;
                await member.setNickname(data.nickname, reason);
                await this.logAction(guild, 'SET_NICKNAME', `${member.user.tag} -> ${data.nickname}`, reason, message.author.tag);
                return `Successfully changed **${member.user.tag}** nickname to **${data.nickname}** for: *${reason}*`;
            }
            case 'sendMessage': {
                const channel = guild.channels.cache.get(data.channelId) as TextChannel;
                if (!channel || !channel.isTextBased()) return `Failed to send message: Channel ${data.channelId} not found or not text-based.`;
                await channel.send(data.content);
                await this.logAction(guild, 'SEND_MESSAGE', `Message sent to #${channel.name}`, reason, message.author.tag);
                return `Successfully sent message to **#${channel.name}** for: *${reason}*`;
            }
            case 'setChannelTopic': {
                const channel = guild.channels.cache.get(data.channelId || message.channelId) as TextChannel;
                if (!channel || !channel.setTopic) return `Failed to set topic: Invalid channel.`;
                await channel.setTopic(data.topic, reason);
                await this.logAction(guild, 'SET_TOPIC', `Topic updated in #${channel.name}`, reason, message.author.tag);
                return `Successfully updated topic in **#${channel.name}** for: *${reason}*`;
            }
            default:
                return `AI attempted unknown action: ${action}`;
        }
    }
}
