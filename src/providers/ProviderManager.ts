import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIResponse {
    text: string;
    model: string;
}

export class ProviderManager {
    private providers: string[];
    private openRouterModels: string[];
    
    constructor() {
        this.providers = [
            'gemini', 'openai', 'claude', 'groq', 'mistral', 'openrouter'
        ];
        this.openRouterModels = [
            'openrouter/auto',
            'meta-llama/llama-3.1-8b-instruct:free',
            'qwen/qwen-2.5-7b-instruct:free',
            'google/gemma-2-9b-it:free',
            'mistralai/mistral-7b-instruct:free'
        ];
    }

    async getResponse(prompt: string): Promise<AIResponse> {
        const shuffledProviders = [...this.providers].sort(() => Math.random() - 0.5);
        
        for (const provider of shuffledProviders) {
            try {
                console.log(`[DEBUG] Attempting to use provider: ${provider}`);
                const response = await this.callProvider(provider, prompt);
                if (response && response.text) {
                    console.log(`[DEBUG] Success with provider: ${provider}`);
                    return response;
                }
                console.log(`[DEBUG] Provider ${provider} returned empty response.`);
            } catch (error: any) {
                console.log(`[DEBUG] Provider ${provider} failed: ${error.message}`);
                continue;
            }
        }
        throw new Error('All AI providers failed');
    }

    private async callProvider(provider: string, prompt: string): Promise<AIResponse | null> {
        if (provider === 'openrouter') {
            const models = [...this.openRouterModels].sort(() => Math.random() - 0.5);
            for (const modelId of models) {
                try {
                    return await this.callOpenRouter(modelId, prompt);
                } catch (error: any) {
                    continue;
                }
            }
            return null;
        }

        switch (provider) {
            case 'gemini':
                return this.callGemini(prompt);
            case 'openai':
                return this.callOpenAI(prompt);
            case 'claude':
                return this.callClaude(prompt);
            case 'groq':
                return this.callGroq(prompt);
            case 'mistral':
                return this.callMistral(prompt);
            default:
                return null;
        }
    }

    private async callGemini(prompt: string): Promise<AIResponse> {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        return { text: result.response.text(), model: 'Gemini 1.5 Flash' };
    }

    private async callOpenAI(prompt: string): Promise<AIResponse> {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }]
        }, {
            headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
        });
        return { text: response.data.choices[0].message.content, model: 'GPT-4o' };
    }

    private async callClaude(prompt: string): Promise<AIResponse> {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }]
        }, {
            headers: {
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            }
        });
        return { text: response.data.content[0].text, model: 'Claude 3.5 Sonnet' };
    }

    private async callOpenRouter(modelId: string, prompt: string): Promise<AIResponse> {
        try {
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: modelId,
                messages: [{ role: 'user', content: prompt }]
            }, {
                headers: { 
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://github.com/SejedTr/vortex',
                    'X-Title': 'Vortex Bot'
                },
                timeout: 60000
            });
            
            const text = response.data?.choices?.[0]?.message?.content || null;
            return { text, model: `${modelId} (OpenRouter)` };
        } catch (error: any) {
            throw error;
        }
    }

    private async callGroq(prompt: string): Promise<AIResponse> {
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'mixtral-8x7b-32768',
            messages: [{ role: 'user', content: prompt }]
        }, {
            headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }
        });
        return { text: response.data.choices[0].message.content, model: 'Mixtral 8x7b (Groq)' };
    }

    private async callMistral(prompt: string): Promise<AIResponse> {
        const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
            model: 'mistral-large-latest',
            messages: [{ role: 'user', content: prompt }]
        }, {
            headers: { 'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}` }
        });
        return { text: response.data.choices[0].message.content, model: 'Mistral Large' };
    }
}
