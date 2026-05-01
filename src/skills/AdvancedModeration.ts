import { Message, EmbedBuilder } from 'discord.js';
import { Skill } from './Skill';
import { WarnManager } from '../utils/WarnManager';

export const AdvancedModeration: Skill = {
    actionId: 'advancedModeration',
    name: 'Advanced Moderation Info',
    description: 'View warning history and moderation status for a user.',
    jsonStructure: '{"action": "advancedModeration", "data": {"userId": "ID"}}',
    execute: async (message: Message, data: any): Promise<any> => {
        const userId = data.userId || message.author.id;
        const target = await message.client.users.fetch(userId).catch(() => null);

        if (!target) return `User ID \`${userId}\` not found.`;

        const warnings = WarnManager.getWarnings(userId);
        const embed = new EmbedBuilder()
            .setTitle(`Moderation Report: ${target.tag}`)
            .setThumbnail(target.displayAvatarURL())
            .setColor(warnings.length > 0 ? '#FF4500' : '#00FF00')
            .addFields(
                { name: 'Total Warnings', value: `**${warnings.length}**`, inline: true },
                { name: 'User ID', value: `\`${userId}\``, inline: true }
            );

        if (warnings.length > 0) {
            const list = warnings.map((w, i) => `**${i + 1}.** *${w.reason}* (By <@${w.staffId}> on <t:${Math.floor(w.timestamp / 1000)}:d>)`).join('\n');
            embed.setDescription(`**Warning History:**\n${list.length > 2000 ? list.substring(0, 2000) + '...' : list}`);
        } else {
            embed.setDescription('This user has a clean record! ✨');
        }

        return { embeds: [embed] };
    }
};

export default AdvancedModeration;
