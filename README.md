# Vortex Manager 🌪️
> **The Intelligent Core of Your Discord Community.**

Vortex is a state-of-the-art, AI-driven Discord management engine designed for high-security, autonomous, and professional community oversight. Built on a multi-model fallback architecture, Vortex transforms your server into a self-regulating ecosystem.

![Vortex Banner](https://raw.githubusercontent.com/SEJED-DEV/vortex/main/banner.png) *(Placeholder for your banner)*

## 🚀 Advanced Capabilities

### 🧠 Vision-Capable AI Core
Vortex isn't just a text bot. It can **see**.
- **Image Analysis**: Upload an image or send a link, and Vortex will describe, analyze, and react to it.
- **Multimodal Intelligence**: Uses Gemini 1.5 Pro and Claude 3.5 Sonnet to understand complex visual contexts.

### 🛡️ Advanced Moderation Suite
Professional-grade tools for community safety.
- **Persistent Warnings**: 3-warn threshold with automatic 1-hour timeouts.
- **Native Timeouts**: AI-driven muting using Discord's built-in system.
- **Softbans & Purges**: Instantly clear chat history while removing bad actors.
- **Action Auditing**: Every AI decision is logged in `#ai-actions-logs` with reasoning.

### 🧩 Power-Skill Modules
Vortex comes pre-loaded with high-end capabilities:
- 🎨 **AI Image Artist**: Generate stunning artwork via Flux & DALL-E 3 directly in chat.
- 🔍 **Web Search**: Real-time internet access via Perplexity to answer current-event questions.
- 🌐 **GitHub Pulse**: Live repository tracking (commits, PRs, issues) posted to your channels.
- 🤖 **Dynamic Auto-Responder**: Admins can set custom triggers and responses on the fly.
- 📊 **Server Analytics**: Deep-dive into server health, sentiment, and member statistics.

### 🛠️ Self-Evolution & Integrity
- **Autonomous Patching**: The bot can read, debug, and upgrade its own source code via the `evolve` skill.
- **Integrity Shields**: Constant monitoring for external file modifications with AI-driven security alerts.

---

## 🛠️ Installation & Setup

1. **Clone & Install**:
   ```bash
   git clone https://github.com/SEJED-DEV/vortex.git
   cd vortex
   npm install
   ```

2. **Environment Configuration**:
   Rename `.env.example` to `.env` and provide your API keys.
   ```env
   DISCORD_TOKEN=...
   OPENROUTER_API_KEY=...
   GEMINI_API_KEY=...
   ```

3. **Deploy**:
   ```bash
   npm run build
   npm start
   ```

---

## 🏗️ Architecture

Vortex uses a **Modular Handler Pattern**:
- **`ProviderManager`**: Manages model rotation and fallbacks.
- **`ManagementManager`**: Executes low-level Discord actions (bans, roles, channels).
- **`SkillManager`**: Dynamically loads `.ts` modules from the `src/skills` directory.
- **`SessionManager`**: Maintains multi-turn conversation history.

---

## 📜 License
This project is licensed under the **CC BY-NC-SA 4.0**. See `LICENSE` for details.

## 👨‍💻 Developed by Sejed TRABELSSI
- **Support**: [Discord Server](https://discord.gg/pun3PXXDuE)
- **Instagram**: [@http.sejed.official](https://www.instagram.com/http.sejed.official/)
