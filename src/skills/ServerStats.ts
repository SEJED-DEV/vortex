import { Message, EmbedBuilder } from 'discord.js';
import { Skill } from './Skill';

const ServerStats: Skill = {
    name: 'Server Stats',
    description: 'Generates a comprehensive server statistics report including member counts, channel breakdown, boost level, and activity overview',
    actionId: 'serverStats',
    jsonStructure: '{"action": "serverStats", "data": {}}',
    execute: async (message: Message, _data: any): Promise<string> => {
        const guild = message.guild!;
        await guild.members.fetch().catch(() => {});

        const totalMembers = guild.memberCount;
        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const humans = totalMembers - bots;

        // Presence data requires GuildPresences privileged intent enabled in Discord Dev Portal
        const presenceEnabled = guild.members.cache.some(m => m.presence !== null);
        const online = presenceEnabled ? guild.members.cache.filter(m => m.presence?.status === 'online').size : null;
        const idle = presenceEnabled ? guild.members.cache.filter(m => m.presence?.status === 'idle').size : null;
        const dnd = presenceEnabled ? guild.members.cache.filter(m => m.presence?.status === 'dnd').size : null;
        const presenceStr = presenceEnabled
            ? `🟢 ${online} online  🌙 ${idle} idle  🔴 ${dnd} dnd`
            : `*(Enable GuildPresences intent in Discord Dev Portal to see online status)*`;

        const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
        const categories = guild.channels.cache.filter(c => c.type === 4).size;
        const threads = guild.channels.cache.filter(c => c.type === 11 || c.type === 12).size;
        const roles = guild.roles.cache.size - 1;
        const emojis = guild.emojis.cache.size;
        const stickers = guild.stickers.cache.size;

        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;
        const boostEmoji = ['🔘', '🥉', '🥈', '🥇'][boostLevel] || '🔘';

        const verificationLevels: { [key: number]: string } = {
            0: 'None', 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Very High'
        };

        const createdAgo = Math.floor((Date.now() - guild.createdTimestamp) / (1000 * 60 * 60 * 24));

        const embed = new EmbedBuilder()
            .setTitle(`📊 Server Stats: ${guild.name}`)
            .setThumbnail(guild.iconURL({ size: 256 }) || '')
            .setColor('#5865F2')
            .addFields(
                {
                    name: '👥 Members',
                    value: `Total: **${totalMembers}**\nHumans: **${humans}** | Bots: **${bots}**\n${presenceStr}`,
                    inline: true
                },
                {
                    name: '📁 Channels',
                    value: `Text: **${textChannels}** | Voice: **${voiceChannels}**\nCategories: **${categories}** | Threads: **${threads}**`,
                    inline: true
                },
                {
                    name: `${boostEmoji} Boost Status`,
                    value: `Level **${boostLevel}** — **${boostCount}** boosts`,
                    inline: true
                },
                {
                    name: '🎭 Roles & Extras',
                    value: `Roles: **${roles}** | Emojis: **${emojis}** | Stickers: **${stickers}**`,
                    inline: true
                },
                {
                    name: '🔒 Verification',
                    value: verificationLevels[guild.verificationLevel] || 'Unknown',
                    inline: true
                },
                {
                    name: '📅 Created',
                    value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R> (${createdAgo} days ago)`,
                    inline: true
                }
            )
            .setFooter({ text: `Server ID: ${guild.id}` })
            .setTimestamp();

        return { embeds: [embed] } as any;
    }
};

export default ServerStats;
