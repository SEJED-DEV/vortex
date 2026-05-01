import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface AIResponse {
    text: string | null;
    model: string;
}

export class ProviderManager {
    private providers = ['gemini', 'openai', 'claude', 'groq', 'mistral', 'openrouter'];
    private openRouterModels = [
        'anthropic/claude-3.5-sonnet',
        'openai/gpt-4o',
        'meta-llama/llama-3.1-405b-instruct',
        'google/gemini-pro-1.5',
        'mistralai/mistral-large-2407',
        'meta-llama/llama-3.1-70b-instruct'
    ];

    async getResponse(prompt: string): Promise<AIResponse> {
        for (const provider of this.providers) {
            try {
                const response = await this.callProvider(provider, prompt);
                if (response && response.text) return response;
            } catch (error) {}
        }
        throw new Error('All AI providers failed to respond.');
    }

    private async callProvider(provider: string, prompt: string): Promise<AIResponse | null> {
        if (provider === 'openrouter') {
            for (const modelId of this.openRouterModels) {
                try {
                    return await this.callOpenRouter(modelId, prompt);
                } catch (error: any) {
                    continue;
                }
            }
            return null;
        }

        const keys: { [key: string]: string | undefined } = {
            gemini: process.env.GEMINI_API_KEY,
            openai: process.env.OPENAI_API_KEY,
            claude: process.env.CLAUDE_API_KEY,
            groq: process.env.GROQ_API_KEY,
            mistral: process.env.MISTRAL_API_KEY
        };

        const key = keys[provider];
        if (!key) return null;

        try {
            switch (provider) {
                case 'gemini': return await this.callGemini(key, prompt);
                case 'openai': return await this.callOpenAI(key, prompt);
                case 'claude': return await this.callClaude(key, prompt);
                case 'groq': return await this.callGroq(key, prompt);
                case 'mistral': return await this.callMistral(key, prompt);
                default: return null;
            }
        } catch (error) {
            return null;
        }
    }

    private async callOpenRouter(modelId: string, prompt: string): Promise<AIResponse | null> {
        const key = process.env.OPENROUTER_API_KEY;
        if (!key) return null;

        try {
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: modelId,
                messages: [{ role: 'user', content: prompt }]
            }, {
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                timeout: 60000
            });

            const text = response.data?.choices?.[0]?.message?.content || null;
            return { text, model: `${modelId} (OpenRouter)` };
        } catch (error: any) {
            throw error;
        }
    }

    private async callGemini(key: string, prompt: string): Promise<AIResponse> {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const result = await model.generateContent(prompt);
        return { text: result.response.text(), model: 'gemini-1.5-pro (Google)' };
    }

    private async callOpenAI(key: string, prompt: string): Promise<AIResponse> {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }]
        }, { headers: { 'Authorization': `Bearer ${key}` } });
        return { text: response.data.choices[0].message.content, model: 'gpt-4o (OpenAI)' };
    }

    private async callClaude(key: string, prompt: string): Promise<AIResponse> {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }]
        }, { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' } });
        return { text: response.data.content[0].text, model: 'claude-3-5-sonnet (Anthropic)' };
    }

    private async callGroq(key: string, prompt: string): Promise<AIResponse> {
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.1-70b-versatile',
            messages: [{ role: 'user', content: prompt }]
        }, { headers: { 'Authorization': `Bearer ${key}` } });
        return { text: response.data.choices[0].message.content, model: 'llama-3.1-70b (Groq)' };
    }

    private async callMistral(key: string, prompt: string): Promise<AIResponse> {
        const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
            model: 'mistral-large-latest',
            messages: [{ role: 'user', content: prompt }]
        }, { headers: { 'Authorization': `Bearer ${key}` } });
        return { text: response.data.choices[0].message.content, model: 'mistral-large (Mistral)' };
    }
}
