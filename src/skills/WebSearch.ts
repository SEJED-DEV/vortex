import { EMBED_COLOR, EMBED_FOOTER_TEXT, BOT_NAME } from '../utils/Config';
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
    if (!query) return '❌ Please provide a search query.';
    try {
      const { search } = require('duck-duck-scrape');
      const searchResults = await search(query, { safeSearch: 'moderate' });
      if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
        return 'ℹ️ No results found for that query.';
      }
      const topResults = searchResults.results.slice(0, 3);
      let description = '';
      topResults.forEach((res: any, i: number) => {
        description += `**${i + 1}. [${res.title}](${res.url})**\n${res.description}\n\n`;
      });
      const embed = new EmbedBuilder()
        .setTitle(`🔍 Web Search: ${query}`)
        .setDescription(description)
        .setColor(EMBED_COLOR as any)
        .setFooter({ text: `Powered by DuckDuckGo (Free Tier)` })
        .setTimestamp();
      return { embeds: [embed] };
    } catch (error: any) {
      return `❌ Web search failed. Error: ${error.message}`;
    }
  },
};
export default WebSearch;
