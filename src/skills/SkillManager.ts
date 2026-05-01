import fs from 'fs';
import path from 'path';
import { Message } from 'discord.js';
import { Skill } from './Skill';
export class SkillManager {
    private static skills: Map<string, Skill> = new Map();
    static async loadSkills() {
        const skillsDir = __dirname;
        const files = fs.readdirSync(skillsDir).filter(f => 
            (f.endsWith('.js') || (f.endsWith('.ts') && !f.endsWith('.d.ts'))) && 
            f !== 'Skill.js' && f !== 'Skill.ts' && 
            f !== 'SkillManager.js' && f !== 'SkillManager.ts'
        );
        for (const file of files) {
            try {
                const skillModule = await import(path.join(skillsDir, file));
                const skill: Skill = skillModule.default;
                if (skill && skill.actionId) {
                    this.skills.set(skill.actionId, skill);
                }
            } catch (e) {}
        }
    }
    static getSkillsPrompt(): string {
        return Array.from(this.skills.values())
            .map((s, i) => `${i + 11}. ${s.description}: ${s.jsonStructure}`)
            .join('\n');
    }
    static hasSkill(actionId: string): boolean {
        return this.skills.has(actionId);
    }
    static async execute(actionId: string, message: Message, data: any): Promise<string> {
        const skill = this.skills.get(actionId);
        if (!skill) return `Skill ${actionId} not found.`;
        return await skill.execute(message, data);
    }
}
