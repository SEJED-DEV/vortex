import { Message } from 'discord.js';
import { Skill } from './Skill';
import { ServerBuilder } from '../utils/ServerBuilder';
const ServerArchitect: Skill = {
    name: 'Server Architect',
    description: 'Build professional server structures (roles, categories, channels)',
    actionId: 'build',
    jsonStructure: '{"action": "build", "data": {"roles": [...], "categories": [...]}}',
    execute: async (message: Message, data: any) => {
        const buildErrors = await ServerBuilder.build(message.guild!, data);
        let completionMsg = `Server architecture complete.`;
        if (buildErrors.length > 0) {
            completionMsg += `\n\n**Note: Some items could not be created due to permissions:**\n${buildErrors.map(e => `• ${e}`).join('\n')}`;
        }
        return completionMsg;
    }
};
export default ServerArchitect;
