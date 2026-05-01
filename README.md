# Vortex

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](http://creativecommons.org/licenses/by-nc-sa/4.0/)

Vortex is a state-of-the-art Discord bot designed to revolutionize server management through intelligent automation. Built with a focus on seamless user experience, Vortex utilizes multiple world-class AI agents to transform natural language dialogues into fully structured Discord server architectures.

## Core Features

### 🤖 Intelligent Dialogue System
Instead of complex commands, Vortex engages in a conversational dialogue. Simply mention the bot to start a session. It will ask relevant questions to understand your theme, community size, and specific requirements before generating a single role or channel.

### 🌐 Multi-Agent Architecture
Vortex is powered by a robust fallback system that integrates over 15 industry-leading AI agents:
- **Gemini 1.5 Flash** (Primary)
- **GPT-4o**
- **Claude 3.5 Sonnet**
- **Groq (Mixtral 8x7b)**
- **Mistral Large**
- **OpenRouter Suite** (10+ Agents including Llama 3 70B, Claude 3 Opus, Gemini Pro 1.5, GPT-4 Turbo, MythoMax, Nous Hermes 2, and more).

This ensures nearly 100% availability and high-quality responses by automatically rotating through providers if one is unavailable.

### 🏗️ Automated Server Construction
Once a design is finalized, Vortex programmatically creates:
- **Hierarchical Roles**: With specific HEX colors and permissions.
- **Themed Categories**: Logical grouping for channels.
- **Optimized Channels**: Both text and voice, tailored to your community's needs.

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- A Discord Bot Token
- At least one AI API Key

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/SejedTr/vortex.git
   cd vortex
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the environment:
   - Rename `.env.example` to `.env`.
   - Fill in your `DISCORD_TOKEN` and preferred AI API keys.

### Running the Bot
- **Development**: `npm run dev`
- **Production**: `npm run build && npm start`

## Commands
- **Ping/Mention**: Start an interactive session to build a server.
- **!credits**: View information about the creator and professional links.

## Technical Stack
- **Language**: TypeScript
- **Framework**: Discord.js v14
- **AI Integration**: Custom ProviderManager for multi-model orchestration.
- **Infrastructure**: Designed for easy deployment via Docker or local hosting.

## License & Attribution

Copyright (c) 2026 **Sejed TRABELSSI**.

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License**.

### Terms
1. **Attribution**: You must give appropriate credit (Name & GitHub Link).
2. **Non-Commercial**: You may not use this material for commercial purposes or sale.
3. **ShareAlike**: If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

---
Developed by [Sejed TRABELSSI](https://sejed.dev)
[Instagram](https://www.instagram.com/http.sejed.official/) | [Support Server](https://discord.gg/pun3PXXDuE)
