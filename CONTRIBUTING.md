# Contributing to Vortex

We welcome contributions that expand the capabilities and intelligence of Vortex. To maintain the system's integrity and performance, please follow these guidelines.

## 🛠️ Development Workflow

1. **Modular Skills**: If you are adding a new feature, implement it as a "Skill" in the `src/skills` directory. Avoid modifying the core `index.ts` unless absolutely necessary.
2. **TypeScript**: All code must be written in TypeScript and follow the existing directory structure.
3. **Security**: Never commit sensitive keys or credentials. Use the provided environment variable system.
4. **Code Style**: 
    - Keep functions focused and modular.
    - Core system files follow a "minimal comment" policy to maintain focus on logic and security.
    - Use the `logSystem` utility for consistent console output.

## 🚀 Creating a Pull Request

The bot itself is capable of generating Pull Requests for its own improvements. If you are a human contributor:
1. Fork the repository.
2. Create a feature branch.
3. Commit your changes with clear, descriptive messages.
4. Submit a Pull Request to the `main` branch.

## 🧠 Skill Template

Every skill must export a default object conforming to the `Skill` interface:

```typescript
import { Message } from 'discord.js';
import { Skill } from './Skill';

const MySkill: Skill = {
    name: 'Skill Name',
    description: 'Concise description for the AI',
    actionId: 'unique_action_id',
    jsonStructure: '{"action": "unique_action_id", "data": {...}}',
    execute: async (message: Message, data: any) => {
        // Implementation
        return "Result message for the user";
    }
};

export default MySkill;
```

## 📜 Licensing

By contributing to Vortex, you agree that your contributions will be licensed under the same **CC BY-NC-SA 4.0** license as the core project.
