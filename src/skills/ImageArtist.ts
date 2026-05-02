import { EMBED_COLOR, EMBED_FOOTER_TEXT, BOT_NAME } from '../utils/Config';
import { Message, EmbedBuilder } from 'discord.js';
import { Skill } from './Skill';
import axios from 'axios';
export const ImageArtist: Skill = {
  actionId: 'generateImage',
  name: 'AI Image Artist',
  description: 'Generates stunning AI images based on a text prompt using Flux or DALL-E.',
  jsonStructure: '{"action": "generateImage", "data": {"prompt": "description of image", "model": "flux|dalle"}}',
  execute: async (message: Message, data: any): Promise<any> => {
    const prompt = data.prompt;
    if (!prompt) return '❌ Please provide a prompt for the image.';
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&nologo=true`;
    try {
      await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 30000 });
      const embed = new EmbedBuilder()
        .setTitle(`🎨 Artwork: ${prompt.substring(0, 200)}${prompt.length > 200 ? '...' : ''}`)
        .setImage(imageUrl)
        .setColor(EMBED_COLOR as any)
        .setFooter({ text: `Generated via Pollinations.ai (Free Tier)` })
        .setTimestamp();
      return { embeds: [embed] };
    } catch (error: any) {
      return `❌ Image generation failed: ${error.message}`;
    }
  },
};
export default ImageArtist;
