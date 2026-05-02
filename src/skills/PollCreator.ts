import { EMBED_COLOR, EMBED_FOOTER_TEXT, BOT_NAME } from '../utils/Config';
import { Message, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { Skill } from './Skill';
const PollCreator: Skill = {
  name: 'Poll Creator',
  description: 'Creates an interactive button-based poll with live results in any channel',
  actionId: 'createPoll',
  jsonStructure:
    '{"action": "createPoll", "data": {"question": "Poll question?", "options": ["Option A", "Option B"], "channelId": "optional CHANNEL_ID", "duration": "optional minutes"}}',
  execute: async (message: Message, data: any): Promise<string> => {
    const guild = message.guild!;
    const question = data?.question || data?.title;
    if (!question || typeof question !== 'string') return `❌ Poll failed: No question provided.`;
    const options: string[] = Array.isArray(data?.options) ? data.options.slice(0, 5) : ['Yes', 'No'];
    const duration = parseInt(data?.duration) || 60;
    const targetChannel = data?.channelId
      ? (guild.channels.cache.get(String(data.channelId)) as any) ||
        (guild.channels.cache.find((c: any) => c.name === String(data.channelId)) as any)
      : message.channel;
    if (!targetChannel || !targetChannel.isTextBased()) return `❌ Poll failed: Invalid channel.`;
    const votes = new Map<string, number>();
    const counts = new Array(options.length).fill(0);
    const generateEmbed = () => {
      const totalVotes = counts.reduce((a, b) => a + b, 0);
      const optionsText = options
        .map((opt, i) => {
          const count = counts[i];
          const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
          const progressBar = '🟩'.repeat(Math.floor(percentage / 10)) + '⬛'.repeat(10 - Math.floor(percentage / 10));
          return `**${opt}**\n${progressBar} ${percentage}% (${count} votes)`;
        })
        .join('\n\n');
      return new EmbedBuilder()
        .setTitle(`📊 ${question}`)
        .setDescription(optionsText)
        .setColor(EMBED_COLOR as any)
        .setFooter({ text: `Total Votes: ${totalVotes} • Ends in ${duration} minute(s)` })
        .setTimestamp();
    };
    const buttons = options.map((opt, i) =>
      new ButtonBuilder()
        .setCustomId(`poll_${i}`)
        .setLabel(opt.length > 80 ? opt.substring(0, 77) + '...' : opt)
        .setStyle(ButtonStyle.Primary),
    );
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
    const pollMessage = await targetChannel.send({ embeds: [generateEmbed()], components: [row] });
    const collector = pollMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: duration * 60 * 1000,
    });
    collector.on('collect', async (i: any) => {
      const optionIndex = parseInt(i.customId.split('_')[1]);
      const userId = i.user.id;
      if (votes.has(userId)) {
        const oldVote = votes.get(userId)!;
        if (oldVote === optionIndex) {
          await i.reply({ content: 'You have already voted for this option.', ephemeral: true });
          return;
        }
        counts[oldVote]--;
      }
      votes.set(userId, optionIndex);
      counts[optionIndex]++;
      await i.update({ embeds: [generateEmbed()] });
    });
    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        buttons.map((b) => ButtonBuilder.from(b).setDisabled(true)),
      );
      const finalEmbed = generateEmbed()
        .setColor(EMBED_COLOR as any)
        .setFooter({ text: `Poll Ended • Total Votes: ${votes.size}` });
      const maxVotes = Math.max(...counts);
      const winners = options.filter((_, i) => counts[i] === maxVotes);
      if (maxVotes > 0) {
        finalEmbed.addFields({ name: '🏆 Winner', value: `**${winners.join(', ')}** with **${maxVotes}** vote(s)!` });
      }
      await pollMessage.edit({ embeds: [finalEmbed], components: [disabledRow] }).catch(() => {});
      await targetChannel.send({ content: `📊 The poll **"${question}"** has ended!`, embeds: [finalEmbed] });
    });
    return `✅ Interactive Poll created in **#${targetChannel.name}**! Results will finalize in ${duration} minute(s).`;
  },
};
export default PollCreator;
