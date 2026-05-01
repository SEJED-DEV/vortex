# Contributing to Vortex

Thank you for your interest in contributing to Vortex! As a professional AI-driven project, we maintain high standards for code quality and documentation.

## Development Workflow

1. **Environment Setup**:
   - Ensure you have Node.js v18+ installed.
   - Install dependencies: `npm install`.
   - Setup your `.env` file with necessary API keys.

2. **Coding Standards**:
   - **Clean Code**: We follow a strict policy of no comments or emojis in the source code.
   - **TypeScript**: All new features must be implemented in TypeScript with proper type safety.
   - **Provider Integration**: When adding new AI providers, update the `ProviderManager.ts` to include fallback logic and proper attribution.

3. **Feature Implementation**:
   - **Interactive Flow**: Any changes to the user interaction must maintain the conversational state machine in `index.ts`.
   - **Server Building**: Ensure the `ServerBuilder.ts` remains decoupled from the AI logic.

4. **Pull Request Process**:
   - Update the `README.md` if your changes introduce new features or configuration requirements.
   - Ensure the project builds successfully with `npm run build`.

## Documentation

Documentation is a core part of Vortex. The `README.md` should always reflect the current state of the architecture and setup process. Any changes to the AI providers must be documented in the "Multi-Agent Architecture" section.

## License

By contributing to this repository, you agree that your contributions will be licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.

---
Copyright (c) 2026 Sejed TRABELSSI.
