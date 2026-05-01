# Vortex Manager 🌪️

Vortex is a state-of-the-art, AI-driven Discord server management system designed for maximum autonomy and professional community oversight. Unlike traditional bots, Vortex acts as a digital community manager, capable of architecting servers, moderating users, and evolving its own capabilities.

## 🚀 Key Features

- **AI-Driven Moderation**: Performs kick, ban, purge, and slowmode actions with mandatory, professional reasoning.
- **Server Architect**: Programmatically constructs complex server structures (roles, categories, channels) through natural language.
- **Modular Skill System**: Easily extend the bot's capabilities by dropping new skill modules into the `src/skills` directory.
- **Self-Evolution**: The bot can read, modify, and upgrade its own source code (Administrator only).
- **Automated Integrity Monitoring**: Scans its own directory every 30 minutes for external modifications and generates AI-driven reports.
- **Multi-Agent Fallback**: Robust resilience system rotating through multiple AI providers (OpenRouter, Gemini, OpenAI, Claude, Groq, Mistral).

## 🛠️ Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SEJED-DEV/vortex.git
   cd vortex
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Rename `.env.example` to `.env` and fill in your credentials.
   ```env
   DISCORD_TOKEN=your_token
   OPENROUTER_API_KEY=your_key
   ```

4. **Build and Start**:
   ```bash
   npm run build
   npm start
   ```

## 🧩 Adding Skills

Adding new capabilities is as simple as creating a new file in `src/skills/`:

```typescript
export default {
    name: 'My New Skill',
    description: 'What this skill does',
    actionId: 'mySkill',
    jsonStructure: '{"action": "mySkill", "data": {...}}',
    execute: async (message, data) => {
        // Your logic here
        return "Action complete!";
    }
}
```

## 🛡️ Security

Vortex is built with a security-first mindset. Core authentication keys are obfuscated within system protocols, and sensitive operations like "Self-Evolution" are strictly restricted to server administrators.

## 📜 License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**.

## 👨‍💻 Developer

Developed by **[Sejed TRABELSSI](https://sejed.dev)**.
- **Support**: [Discord Server](https://discord.gg/pun3PXXDuE)
- **Instagram**: [@http.sejed.official](https://www.instagram.com/http.sejed.official/)
