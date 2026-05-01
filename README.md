# Vortex Manager 🌪️
> **The Intelligent Core of Your Discord Community.**

Vortex is a state-of-the-art, AI-driven Discord management engine designed for high-security, autonomous, and professional community oversight. Built on a multi-model fallback architecture, Vortex transforms your server into a self-regulating ecosystem.

## 🚀 Advanced Capabilities

### 🧠 Free-Tier "No Paywall" Architecture
Vortex is configured to use industry-leading free APIs, bypassing expensive token limits:
- **Lightning LLMs**: Powered by **Groq** (Llama 3.3) and **Gemini API** for ultra-fast, free reasoning.
- **Limitless Web Search**: Uses **DuckDuckGo** scrapers instead of paid APIs to fetch live internet data instantly.
- **Infinite Image Generation**: Uses **Pollinations.ai** to generate stunning images without an API key.

### 📚 Omniscient Logging & Memory
Vortex literally *never forgets*. 
- **Console-to-File Hook**: Every single terminal output, diagnostic error, and AI thought process is automatically mirrored to `data/logs/console.log` in real-time.
- **Persistent User Profiles**: Every interaction is permanently logged to `data/users/<userId>.json`.
- **Premium Visual Audit**: System logs in `ai-actions-logs` feature a "Sapphire-grade" UI with dynamic coloring and rich metadata.

### 🛡️ Advanced Moderation & Security
Professional-grade tools for community safety.
- **Autonomous Self-Moderation**: Vortex is authorized to enforce its own authority. If a user is disrespectful, the engine can autonomously issue warnings and timeouts.
- **Security Auditor**: Scans roles for dangerous permissions, detects exposed webhooks, and checks MFA levels.
- **Native Timeouts & Warnings**: AI-driven muting and warning system with automatic DM notifications to targets.
- **Softbans & Purges**: Instantly clear chat history while removing bad actors.

### 🧩 Available Skills (Commands)
Vortex responds natively to conversational requests using these underlying modules:
- `vortexXP` — View your leveling Rank Card, XP multipliers, or the Server Leaderboard.
- `createPoll` — Create interactive, button-based polls with live vote counting.
- `generateImage` — Generate artwork from text using Pollinations.ai.
- `webSearch` — Search the live web using DuckDuckGo.
- `serverStats` — Generate an embed showing population growth, VC engagement, and server health.
- `autoResponder` — Add regex-supported chat triggers with randomized responses (Staff Only).
- `githubPulse` — Track live GitHub repository commits/PRs (Admin Only).
- `securityAudit` — Run a deep vulnerability scan on the server (Admin Only).

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
   Rename `.env.example` to `.env` and provide your optional API keys.
   ```env
   DISCORD_TOKEN=your_bot_token
   # AI Providers
   GROQ_API_KEY=optional_but_recommended
   GEMINI_API_KEY=optional_but_recommended
   OPENROUTER_API_KEY=optional
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
- **`SessionManager`**: Maintains multi-turn conversation history with persistent JSON logging.

---

## 📜 License
This project is licensed under the **CC BY-NC-SA 4.0**. See `LICENSE` for details.

## 👨‍💻 Developed by Sejed TRABELSSI
- **Support**: [Discord Server](https://discord.gg/pun3PXXDuE)
- **Instagram**: [@http.sejed.official](https://www.instagram.com/http.sejed.official/)

