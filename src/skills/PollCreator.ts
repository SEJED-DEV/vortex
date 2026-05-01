import { Message, EmbedBuilder } from 'discord.js';
import { Skill } from './Skill';

const PollCreator: Skill = {
    name: 'Poll Creator',
    description: 'Creates an interactive poll embed with reaction-based voting in any channel',
    actionId: 'createPoll',
    jsonStructure: '{"action": "createPoll", "data": {"question": "Poll question?", "options": ["Option A", "Option B", "Option C"], "channelId": "optional CHANNEL_ID", "duration": "optional minutes"}}',
    execute: async (message: Message, data: any): Promise<string> => {
        const guild = message.guild!;
        const question = data?.question || data?.title;
        if (!question || typeof question !== 'string') return `❌ Poll failed: No question provided.`;

        const options: string[] = Array.isArray(data?.options) ? data.options.slice(0, 9) : ['Yes', 'No'];
        const EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
        const duration = parseInt(data?.duration) || 0;

        const targetChannel = data?.channelId
            ? guild.channels.cache.get(String(data.channelId)) as any ||
              guild.channels.cache.find((c: any) => c.name === String(data.channelId)) as any
            : message.channel;

        if (!targetChannel || !targetChannel.isTextBased()) return `❌ Poll failed: Invalid channel.`;

        const optionsText = options.map((opt, i) => `${EMOJIS[i]} **${opt}**`).join('\n');

        const embed = new EmbedBuilder()
            .setTitle(`📊 ${question}`)
            .setDescription(optionsText)
            .setColor('#5865F2')
            .setFooter({ text: `Poll by ${message.author.tag}${duration > 0 ? ` • Ends in ${duration} minute(s)` : ''}` })
            .setTimestamp();

        const pollMessage = await targetChannel.send({ embeds: [embed] });

        for (let i = 0; i < options.length; i++) {
            await pollMessage.react(EMOJIS[i]).catch(() => {});
        }

        if (duration > 0) {
            setTimeout(async () => {
                try {
                    const updated = await pollMessage.fetch();
                    const results = options.map((opt, i) => {
                        const reaction = updated.reactions.cache.get(EMOJIS[i]);
                        const count = (reaction?.count || 1) - 1;
                        return { opt, count };
                    }).sort((a, b) => b.count - a.count);

                    const winner = results[0];
                    const resultsText = results.map((r, i) => `${EMOJIS[i]} **${r.opt}** — ${r.count} vote(s)`).join('\n');

                    const resultEmbed = new EmbedBuilder()
                        .setTitle(`📊 Poll Results: ${question}`)
                        .setDescription(resultsText)
                        .addFields({ name: '🏆 Winner', value: `**${winner.opt}** with **${winner.count}** vote(s)!` })
                        .setColor('#57F287')
                        .setTimestamp();

                    await targetChannel.send({ embeds: [resultEmbed] });
                } catch (e) {}
            }, duration * 60 * 1000);
        }

        return `✅ Poll created in **#${targetChannel.name}** with ${options.length} option(s)!${duration > 0 ? ` Results will post in ${duration} minute(s).` : ''}`;
    }
};

export default PollCreator;
