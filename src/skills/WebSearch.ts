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

        const models = ['perplexity/sonar', 'google/gemini-2.0-flash-thinking-exp:free', 'openai/gpt-4o-mini'];
        let lastError = '';

        for (const modelId of models) {
            try {
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
                if (!result) continue;

                const embed = new EmbedBuilder()
                    .setTitle(`🔍 Search: ${query}`)
                    .setDescription(result.length > 4000 ? result.substring(0, 4000) + '...' : result)
                    .setColor('#00FFFF')
                    .setFooter({ text: `Powered by ${modelId}` })
                    .setTimestamp();

                return { embeds: [embed] };
            } catch (error: any) {
                lastError = error.message;
                if (error.response?.data?.error?.message) lastError = error.response.data.error.message;
                continue;
            }
        }

        return `❌ Web search failed after trying all available models. Last error: ${lastError}`;
    }
};

export default WebSearch;
