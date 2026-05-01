import { Message, EmbedBuilder } from 'discord.js';
import { Skill } from './Skill';

const POSITIVE_WORDS = ['love', 'great', 'awesome', 'excellent', 'happy', 'amazing', 'thanks', 'good', 'nice', 'cool', 'best', 'helpful', 'perfect', 'fantastic', 'wonderful', 'brilliant', 'solid', 'friendly', 'enjoy', 'appreciate'];
const NEGATIVE_WORDS = ['hate', 'bad', 'terrible', 'awful', 'horrible', 'toxic', 'stupid', 'dumb', 'worst', 'useless', 'annoying', 'rude', 'spam', 'scam', 'trash', 'garbage', 'idiot', 'loser', 'boring', 'broken'];

function analyzeSentiment(text: string): { score: number; label: string; emoji: string } {
    const lower = text.toLowerCase();
    const words = lower.split(/\W+/);
    let score = 0;
    for (const word of words) {
        if (POSITIVE_WORDS.includes(word)) score++;
        if (NEGATIVE_WORDS.includes(word)) score--;
    }
    if (score > 1) return { score, label: 'Very Positive', emoji: '😄' };
    if (score === 1) return { score, label: 'Positive', emoji: '🙂' };
    if (score === 0) return { score, label: 'Neutral', emoji: '😐' };
    if (score === -1) return { score, label: 'Negative', emoji: '😟' };
    return { score, label: 'Very Negative', emoji: '😡' };
}

const SentimentAnalysis: Skill = {
    name: 'Sentiment Analysis',
    description: 'Analyzes the recent sentiment and mood of a channel or specific user messages to gauge community health',
    actionId: 'analyzeSentiment',
    jsonStructure: '{"action": "analyzeSentiment", "data": {"channelId": "CHANNEL_ID", "userId": "optional USER_ID", "limit": 50}}',
    execute: async (message: Message, data: any): Promise<string> => {
        const guild = message.guild!;
        const channelId = data?.channelId || message.channelId;
        const limit = Math.min(parseInt(data?.limit) || 50, 100);

        const channel = guild.channels.cache.get(channelId) as any;
        if (!channel || !channel.isTextBased()) return `❌ Cannot analyze: Channel not found.`;

        const messages = await channel.messages.fetch({ limit });
        const filtered = data?.userId
            ? messages.filter((m: Message) => m.author.id === data.userId && !m.author.bot)
            : messages.filter((m: Message) => !m.author.bot);

        if (filtered.size === 0) return `No messages found to analyze.`;

        let totalScore = 0;
        const breakdown: { [label: string]: number } = { 'Very Positive': 0, 'Positive': 0, 'Neutral': 0, 'Negative': 0, 'Very Negative': 0 };
        const userScores: { [tag: string]: number[] } = {};

        filtered.forEach((m: Message) => {
            if (!m.content) return;
            const s = analyzeSentiment(m.content);
            totalScore += s.score;
            breakdown[s.label] = (breakdown[s.label] || 0) + 1;
            const tag = m.author.tag;
            if (!userScores[tag]) userScores[tag] = [];
            userScores[tag].push(s.score);
        });

        const avg = totalScore / filtered.size;
        const overall = analyzeSentiment(avg > 0.5 ? 'great' : avg < -0.5 ? 'bad' : 'okay');

        const topUsers = Object.entries(userScores)
            .map(([tag, scores]) => ({ tag, avg: scores.reduce((a, b) => a + b, 0) / scores.length }))
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 3)
            .map(u => `**${u.tag}**: ${u.avg > 0 ? '🟢' : u.avg < 0 ? '🔴' : '⚪'} ${u.avg.toFixed(2)}`);

        const embed = new EmbedBuilder()
            .setTitle(`📊 Sentiment Analysis: #${channel.name}`)
            .setColor(avg > 0 ? '#57F287' : avg < 0 ? '#ED4245' : '#FEE75C')
            .addFields(
                { name: `${overall.emoji} Overall Mood`, value: `**${overall.label}** (Score: ${avg.toFixed(2)})`, inline: false },
                { name: '📈 Breakdown', value: Object.entries(breakdown).map(([k, v]) => `${k}: **${v}**`).join('\n'), inline: true },
                { name: '🏆 Most Positive Users', value: topUsers.length > 0 ? topUsers.join('\n') : 'N/A', inline: true },
                { name: '📝 Messages Analyzed', value: `${filtered.size} of ${messages.size}`, inline: false }
            )
            .setFooter({ text: 'Vortex Sentiment Engine' })
            .setTimestamp();

        return { embeds: [embed] } as any;
    }
};

export default SentimentAnalysis;
