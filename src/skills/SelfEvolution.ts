import { Message, PermissionsBitField } from 'discord.js';
import { Skill } from './Skill';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { ManagementManager } from '../utils/ManagementManager';
import { GitHubManager } from '../utils/GitHubManager';
const SelfEvolution: Skill = {
    name: 'Self Evolution',
    description: 'Read, modify, and upgrade the bot\'s own source code (Admin only)',
    actionId: 'evolve',
    jsonStructure: '{"action": "evolve", "data": {"type": "read|write|rebuild|push", "path": "src/...", "content": "...", "prTitle": "...", "prBody": "..."}}',
    execute: async (message: Message, data: any) => {
        if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return "Unauthorized: Only server administrators can trigger evolution actions.";
        }
        const baseDir = path.join(__dirname, '../../');
        switch (data.type) {
            case 'read': {
                const targetPath = path.join(baseDir, data.path);
                if (!fs.existsSync(targetPath)) return `Error: Path ${data.path} not found.`;
                const stats = fs.statSync(targetPath);
                if (stats.isDirectory()) {
                    const files = fs.readdirSync(targetPath);
                    return `Directory listing for ${data.path}:\n${files.join('\n')}`;
                } else {
                    const content = fs.readFileSync(targetPath, 'utf-8');
                    return `Code contents of ${data.path}:\n\`\`\`typescript\n${content.substring(0, 1500)}\n\`\`\``;
                }
            }
            case 'write': {
                const filePath = path.join(baseDir, data.path);
                const dirPath = path.dirname(filePath);
                if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
                const oldContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '[New File]';
                fs.writeFileSync(filePath, data.content);
                await ManagementManager.logAction(message.guild!, 'SELF_EVOLVE', `Modified ${data.path}`, `Code Change Recorded.`, message.author.tag);
                return `Successfully updated ${data.path}. Use 'rebuild' to apply changes.`;
            }
            case 'push': {
                return await GitHubManager.createPullRequest(
                    data.prTitle || 'Self-Evolution Update',
                    data.prBody || 'Automated code update from Vortex Manager.',
                    'evolution-branch'
                );
            }
            case 'rebuild': {
                return new Promise((resolve) => {
                    exec('npm run build', { cwd: baseDir }, (error, stdout, stderr) => {
                        if (error) resolve(`Rebuild failed: ${stderr}`);
                        else resolve(`Rebuild successful! Restart the bot manually to apply changes.`);
                    });
                });
            }
            default:
                return `Unknown evolution type: ${data.type}`;
        }
    }
};
export default SelfEvolution;
