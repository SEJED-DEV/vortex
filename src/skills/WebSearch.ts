import { Message, EmbedBuilder } from 'discord.js';
import { Skill } from './Skill';
import axios from 'axios';

export const WebSearch: Skill = {
    actionId: 'webSearch',
    name: 'Web Search',
    description: 'Searches the live web to answer questions about current events, technical bugs, or any real-time data.',
    jsonStructure: '{"action": "webSearch", "data": {"query": "search query"}}',
    execute: async (message: Message, data: any): Promise<any> => {
        const query = data.query;
        if (!query) return "❌ Please provide a search query.";

        const key = process.env.OPENROUTER_API_KEY;
        if (!key) return "❌ OpenRouter API key is missing. Cannot perform web search.";

        try {
            // Updated to the current active Perplexity model ID
            const modelId = 'perplexity/sonar';

            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: modelId,
                messages: [{ role: 'user', content: query }]
            }, {
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://github.com/SEJED-DEV/vortex',
                    'X-Title': 'Vortex Manager'
                },
                timeout: 60000
            });

            const result = response.data?.choices?.[0]?.message?.content;
            if (!result) throw new Error("No search results found.");

            const embed = new EmbedBuilder()
                .setTitle(`🔍 Search: ${query}`)
                .setDescription(result.length > 4000 ? result.substring(0, 4000) + '...' : result)
                .setColor('#00FFFF')
                .setFooter({ text: `Powered by ${modelId}` })
                .setTimestamp();

            return { embeds: [embed] };
        } catch (error: any) {
            return `❌ Error searching the web: ${error.message}`;
        }
    }
};

export default WebSearch;
