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

        const models = [
            (data.model === 'dalle' || data.model === 'dall-e') ? 'openai/dall-e-3' : 'black-forest-labs/flux-1-schnell',
            'openai/dall-e-3',
            'black-forest-labs/flux-1-dev'
        ];
        
        let lastError = '';

        for (const modelId of models) {
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
                if (!result) continue;

                // Extract first URL found in the response
                const urlMatch = result.match(/https?:\/\/[^\s\)\"\'\>]+/);
                const imageUrl = urlMatch ? urlMatch[0] : null;

                if (!imageUrl) continue;

                const embed = new EmbedBuilder()
                    .setTitle(`🎨 Artwork: ${prompt.substring(0, 200)}${prompt.length > 200 ? '...' : ''}`)
                    .setImage(imageUrl)
                    .setColor('#FF00FF')
                    .setFooter({ text: `Generated via ${modelId}` })
                    .setTimestamp();

                return { embeds: [embed] };
            } catch (error: any) {
                lastError = error.message;
                if (error.response?.data?.error?.message) lastError = error.response.data.error.message;
                continue;
            }
        }

        return `❌ Image generation failed after trying multiple models. Last error: ${lastError}`;
    }
};

export default ImageArtist;
