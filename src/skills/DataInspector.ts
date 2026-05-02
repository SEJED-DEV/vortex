import { Message } from 'discord.js';
import { Skill } from './Skill';
import fs from 'fs';
import path from 'path';
export const DataInspector: Skill = {
  actionId: 'readData',
  name: 'Data Inspector',
  description: 'Allows the AI to inspect logs, user profiles, and system data files within the data directory.',
  jsonStructure: '{"action": "readData", "data": {"path": "logs/console.log", "operation": "read|list"}}',
  execute: async (message: Message, data: any): Promise<any> => {
    const targetPath = data.path || '';
    const operation = data.operation || 'read';
    const dataRoot = path.join(process.cwd(), 'data');
    const fullPath = path.normalize(path.join(dataRoot, targetPath));
    if (!fullPath.startsWith(dataRoot)) {
      return '❌ Access Denied: You can only access files within the data directory.';
    }
    if (!fs.existsSync(fullPath)) {
      return `❌ Error: Path "${targetPath}" does not exist.`;
    }
    try {
      if (operation === 'list') {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          const files = fs.readdirSync(fullPath);
          return `📂 Directory listing for ${targetPath}:\n` + files.map((f) => `- ${f}`).join('\n');
        } else {
          return `📄 ${targetPath} is a file.`;
        }
      } else {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          const files = fs.readdirSync(fullPath);
          return `📂 ${targetPath} is a directory. Use "list" to see contents.`;
        }
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.length > 3500) {
          return `📄 Content of ${targetPath} (truncated):\n\`\`\`\n${content.substring(content.length - 3500)}\n\`\`\``;
        }
        return `📄 Content of ${targetPath}:\n\`\`\`\n${content}\n\`\`\``;
      }
    } catch (error: any) {
      return `❌ Error accessing data: ${error.message}`;
    }
  },
};
export default DataInspector;
