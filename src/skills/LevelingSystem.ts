import { Message, EmbedBuilder } from 'discord.js';
import { Skill } from './Skill';
import fs from 'fs';
import path from 'path';

interface UserXP {
    xp: number;
    level: number;
    lastMsg: number;
}

export class LevelManager {
    private static FILE_PATH = path.join(process.cwd(), 'data', 'levels.json');

    private static init() {
        const dir = path.dirname(this.FILE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(this.FILE_PATH)) fs.writeFileSync(this.FILE_PATH, JSON.stringify({}));
    }

    public static getData(): Record<string, UserXP> {
        this.init();
        return JSON.parse(fs.readFileSync(this.FILE_PATH, 'utf-8'));
    }

    public static addXP(userId: string, amount: number): { leveledUp: boolean, newLevel: number } {
        const data = this.getData();
        if (!data[userId]) {
            data[userId] = { xp: 0, level: 0, lastMsg: 0 };
        }

        const user = data[userId];
        const now = Date.now();

        // 1 minute cooldown per XP gain to prevent spam
        if (now - user.lastMsg < 60000) return { leveledUp: false, newLevel: user.level };

        user.xp += amount;
        user.lastMsg = now;

        const nextLevelXP = (user.level + 1) * 500;
        let leveledUp = false;

        if (user.xp >= nextLevelXP) {
            user.level += 1;
            leveledUp = true;
        }

        fs.writeFileSync(this.FILE_PATH, JSON.stringify(data, null, 2));
        return { leveledUp, newLevel: user.level };
    }

    public static getRank(userId: string): UserXP | null {
        const data = this.getData();
        return data[userId] || null;
    }
}

export const LevelingSystem: Skill = {
    actionId: 'checkRank',
    name: 'Vortex XP System',
    description: 'Check your current level, XP, and progress towards the next rank.',
    jsonStructure: '{"action": "checkRank", "data": {"userId": "OPTIONAL_ID"}}',
    execute: async (message: Message, data: any): Promise<any> => {
        const targetId = data.userId || message.author.id;
        const rank = LevelManager.getRank(targetId);
        const targetUser = await message.client.users.fetch(targetId);

        if (!rank) {
            return `ℹ️ **${targetUser.username}** hasn't earned any XP yet! Start chatting to level up.`;
        }

        const nextLevelXP = (rank.level + 1) * 500;
        const progress = (rank.xp / nextLevelXP) * 100;
        const progressBar = '🟩'.repeat(Math.floor(progress / 10)) + '⬜'.repeat(10 - Math.floor(progress / 10));

        const embed = new EmbedBuilder()
            .setTitle(`🎖️ Rank Card: ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .setColor('#FFD700')
            .addFields(
                { name: 'Level', value: `\`${rank.level}\``, inline: true },
                { name: 'Total XP', value: `\`${rank.xp}\``, inline: true },
                { name: 'Progress to Level ' + (rank.level + 1), value: `${progressBar} (${Math.floor(progress)}%)` }
            )
            .setFooter({ text: 'Keep chatting to earn more XP!' });

        return { embeds: [embed] };
    }
};

export default LevelingSystem;
