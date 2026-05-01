import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();
export interface AIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
export interface AIResponse {
    text: string | null;
    model: string;
}
export interface VisionContent {
    imageUrl: string;
    mimeType: string;
}
export class ProviderManager {
    private providers = ['groq', 'openrouter', 'openai', 'claude', 'mistral', 'gemini'];
    private openRouterModels = [
            'anthropic/claude-3.5-sonnet',
            'openai/gpt-4o',
            'openai/gpt-oss-20b',
            'google/gemini-2.0-flash-001',
            'meta-llama/llama-3.3-70b-instruct',
            'mistralai/mistral-large-2407',
            'deepseek/deepseek-chat',
            'nvidia/llama-3.1-nemotron-ultra-253b-v1:free',
            'x-ai/grok-4.1-fast:free',
            'cognitivecomputations/dolphin-mixtral-8x7b',
            'google/gemini-2.0-pro-exp-02-05:free',
            'google/learnlm-1.5-pro-experimental:free',
            'meta-llama/llama-3.3-70b-instruct:free',
            'deepseek/deepseek-r1:free',
            'sophosympathizer/rogue-rose-103b-v0.2:free',
            'mistralai/pixtral-12b:free',
            'gryphe/mythomax-l2-13b:free',
            'microsoft/phi-3-medium-128k-instruct:free',
            'qwen/qwen-2.5-72b-instruct:free',
            'openchat/openchat-7b:free'
        ];
    async getResponse(
        systemPrompt: string,
        history: AIMessage[] = [],
        userMessage: string = '',
        visionContent?: VisionContent
    ): Promise<AIResponse> {
        for (const provider of this.providers) {
            try {
                const response = await this.callProvider(provider, systemPrompt, history, userMessage, visionContent);
                if (response && response.text) return response;
            } catch (error: any) {
                console.error(`[Provider Error] ${provider}: ${error.message}`);
            }
        }
        throw new Error('All AI providers failed to respond.');
    }
    private async callProvider(
        provider: string,
        systemPrompt: string,
        history: AIMessage[],
        userMessage: string,
        visionContent?: VisionContent
    ): Promise<AIResponse | null> {
        if (provider === 'openrouter') {
            for (const modelId of this.openRouterModels) {
                try {
                    return await this.callOpenRouter(modelId, systemPrompt, history, userMessage, visionContent);
                } catch (error: any) {
                    console.error(`[OpenRouter Error] ${modelId}: ${error.message}`);
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
        if (!key) {
            if (provider === 'gemini' || provider === 'groq') {
                console.warn(`[Config Warning] ${provider.toUpperCase()}_API_KEY is missing in .env! Skipping free-tier provider.`);
            }
            return null;
        }
        console.log(`[Provider Attempt] Trying ${provider}...`);
        try {
            switch (provider) {
                case 'gemini': return await this.callGemini(key, systemPrompt, history, userMessage, visionContent);
                case 'openai': return await this.callOpenAI(key, systemPrompt, history, userMessage, visionContent);
                case 'claude': return await this.callClaude(key, systemPrompt, history, userMessage, visionContent);
                case 'groq': return await this.callGroq(key, systemPrompt, history, userMessage);
                case 'mistral': return await this.callMistral(key, systemPrompt, history, userMessage);
                default: return null;
            }
        } catch (error: any) {
            console.error(`[Provider Error] ${provider}: ${error.message}`);
            return null;
        }
    }
    private buildOpenAIMessages(
        systemPrompt: string,
        history: AIMessage[],
        userMessage: string,
        visionContent?: VisionContent
    ): any[] {
        const messages: any[] = [{ role: 'system', content: systemPrompt }];
        for (const h of history) {
            messages.push({ role: h.role, content: h.content });
        }
        if (visionContent) {
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: userMessage || 'What do you see in this image?' },
                    { type: 'image_url', image_url: { url: visionContent.imageUrl } }
                ]
            });
        } else if (userMessage) {
            messages.push({ role: 'user', content: userMessage });
        }
        return messages;
    }
    private async callOpenRouter(
        modelId: string,
        systemPrompt: string,
        history: AIMessage[],
        userMessage: string,
        visionContent?: VisionContent
    ): Promise<AIResponse | null> {
        const key = process.env.OPENROUTER_API_KEY;
        if (!key) return null;
        const messages = this.buildOpenAIMessages(systemPrompt, history, userMessage, visionContent);
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: modelId,
            messages
        }, {
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/SEJED-DEV/vortex',
                'X-Title': 'Vortex Manager'
            },
            timeout: 60000
        });
        const text = response.data?.choices?.[0]?.message?.content || null;
        return { text, model: `${modelId} (OpenRouter)` };
    }
    private async callGemini(
        key: string,
        systemPrompt: string,
        history: AIMessage[],
        userMessage: string,
        visionContent?: VisionContent
    ): Promise<AIResponse> {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-1.5-flash',
            systemInstruction: systemPrompt
        });
        const chatHistory = history.map(h => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }]
        }));
        const chat = model.startChat({
            history: chatHistory
        });
        let content: any;
        if (visionContent) {
            const imageRes = await axios.get(visionContent.imageUrl, { responseType: 'arraybuffer' });
            const base64 = Buffer.from(imageRes.data).toString('base64');
            content = [
                { inlineData: { data: base64, mimeType: visionContent.mimeType } },
                { text: userMessage || 'Describe this image in detail.' }
            ];
        } else {
            content = userMessage;
        }
        const result = await chat.sendMessage(content);
        return { text: result.response.text(), model: 'gemini-1.5-pro (Google)' };
    }
    private async callOpenAI(
        key: string,
        systemPrompt: string,
        history: AIMessage[],
        userMessage: string,
        visionContent?: VisionContent
    ): Promise<AIResponse> {
        const messages = this.buildOpenAIMessages(systemPrompt, history, userMessage, visionContent);
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4o',
            messages
        }, { headers: { 'Authorization': `Bearer ${key}` }, timeout: 60000 });
        return { text: response.data.choices[0].message.content, model: 'gpt-4o (OpenAI)' };
    }
    private async callClaude(
        key: string,
        systemPrompt: string,
        history: AIMessage[],
        userMessage: string,
        visionContent?: VisionContent
    ): Promise<AIResponse> {
        const anthropicHistory = history.map(h => ({ role: h.role === 'system' ? 'user' : h.role, content: h.content }));
        let userContent: any = userMessage;
        if (visionContent) {
            const imageRes = await axios.get(visionContent.imageUrl, { responseType: 'arraybuffer' });
            const base64 = Buffer.from(imageRes.data).toString('base64');
            userContent = [
                { type: 'image', source: { type: 'base64', media_type: visionContent.mimeType, data: base64 } },
                { type: 'text', text: userMessage || 'Describe this image.' }
            ];
        }
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2048,
            system: systemPrompt,
            messages: [...anthropicHistory, { role: 'user', content: userContent }]
        }, {
            headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
            timeout: 60000
        });
        return { text: response.data.content[0].text, model: 'claude-3-5-sonnet (Anthropic)' };
    }
    private async callGroq(
        key: string,
        systemPrompt: string,
        history: AIMessage[],
        userMessage: string
    ): Promise<AIResponse> {
        const messages = this.buildOpenAIMessages(systemPrompt, history, userMessage);
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.3-70b-versatile',
            messages
        }, { headers: { 'Authorization': `Bearer ${key}` }, timeout: 60000 });
        return { text: response.data.choices[0].message.content, model: 'llama-3.3-70b (Groq)' };
    }
    private async callMistral(
        key: string,
        systemPrompt: string,
        history: AIMessage[],
        userMessage: string
    ): Promise<AIResponse> {
        const messages = this.buildOpenAIMessages(systemPrompt, history, userMessage);
        const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
            model: 'mistral-large-latest',
            messages
        }, { headers: { 'Authorization': `Bearer ${key}` }, timeout: 60000 });
        return { text: response.data.choices[0].message.content, model: 'mistral-large (Mistral)' };
    }
}
