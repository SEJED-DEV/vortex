import { Message, TextChannel } from 'discord.js';
import { Skill } from './Skill';
import { ManagementManager } from '../utils/ManagementManager';
const AntiSpam: Skill = {
  name: 'Anti-Spam Engine',
  description: 'Analyzes a channel or user for spam patterns (repetitions, message frequency, etc.)',
  actionId: 'analyzeSpam',
  jsonStructure: '{"action": "analyzeSpam", "data": {"userId": "ID", "channelId": "ID", "threshold": number}}',
  execute: async (message: Message, data: any) => {
    const guild = message.guild!;
    const channel = guild.channels.cache.get(data.channelId || message.channelId) as TextChannel;
    if (!channel || !channel.isTextBased()) return 'Error: Invalid channel for analysis.';
    const messages = await channel.messages.fetch({ limit: 50 });
    const userMessages = messages.filter((m) => m.author.id === data.userId);
    if (userMessages.size === 0) return `User ${data.userId} has no recent activity in this channel.`;
    let repetitions = 0;
    let lastContent = '';
    userMessages.forEach((m) => {
      if (m.content === lastContent && m.content.length > 5) repetitions++;
      lastContent = m.content;
    });
    const threshold = data.threshold || 3;
    if (repetitions >= threshold) {
      return `Spam Alert: User <@${data.userId}> has ${repetitions} repetitive messages. Recommendation: Purge or Mute.`;
    }
    return `Analysis Complete: User <@${data.userId}> behavior appears normal (${repetitions} repetitions found).`;
  },
};
export default AntiSpam;
