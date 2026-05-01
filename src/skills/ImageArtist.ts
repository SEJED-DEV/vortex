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
        if (!prompt) return "❌ Please provide a prompt for the image.";

        const key = process.env.OPENROUTER_API_KEY;
        if (!key) return "❌ OpenRouter API key is missing. Cannot generate image.";

        // Default to Flux Schnell as it's fast and high quality
        const modelId = (data.model === 'dalle' || data.model === 'dall-e') ? 'openai/dall-e-3' : 'black-forest-labs/flux-1-schnell';

        try {
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: modelId,
                messages: [{ role: 'user', content: prompt }]
            }, {
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://github.com/SEJED-DEV/vortex',
                    'X-Title': 'Vortex Manager'
                },
                timeout: 150000 
            });

            const result = response.data?.choices?.[0]?.message?.content;
            if (!result) throw new Error("No image data received from AI.");

            // Extract first URL found in the response
            const urlMatch = result.match(/https?:\/\/[^\s\)\"\'\>]+/);
            const imageUrl = urlMatch ? urlMatch[0] : null;

            if (!imageUrl) {
                 return `❌ Image generation failed. The AI did not provide a valid URL. Response: ${result.substring(0, 500)}`;
            }

            const embed = new EmbedBuilder()
                .setTitle(`🎨 Artwork: ${prompt.substring(0, 200)}${prompt.length > 200 ? '...' : ''}`)
                .setImage(imageUrl)
                .setColor('#FF00FF')
                .setFooter({ text: `Generated via ${modelId}` })
                .setTimestamp();

            return { embeds: [embed] };
        } catch (error: any) {
            return `❌ Error generating image: ${error.message}`;
        }
    }
};

export default ImageArtist;
