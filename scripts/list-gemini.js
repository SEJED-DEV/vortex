const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config();

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error('GEMINI_API_KEY missing');
        return;
    }
    const genAI = new GoogleGenerativeAI(key);
    try {
        const result = await genAI.listModels();
        console.log('Available Models:');
        result.models.forEach(m => {
            console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
        });
    } catch (e) {
        console.error('Error listing models:', e.message);
    }
}

listModels();
