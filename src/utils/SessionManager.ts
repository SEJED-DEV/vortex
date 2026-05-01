import fs from 'fs';
import path from 'path';
import { AIMessage } from '../providers/ProviderManager';
export interface UserProfile {
    id: string;
    username: string;
    firstSeen: number;
    lastActive: number;
    history: { role: string; content: any; timestamp: number }[];
    actionsTaken: { action: string; data: any; timestamp: number }[];
}
export class SessionManager {
    private static USERS_DIR = path.join(process.cwd(), 'data', 'users');
    private static init() {
        if (!fs.existsSync(this.USERS_DIR)) {
            fs.mkdirSync(this.USERS_DIR, { recursive: true });
        }
    }
    private static getFilePath(userId: string): string {
        return path.join(this.USERS_DIR, `${userId}.json`);
    }
    public static getProfile(userId: string, username: string = "Unknown"): UserProfile {
        this.init();
        const file = this.getFilePath(userId);
        if (fs.existsSync(file)) {
            try {
                return JSON.parse(fs.readFileSync(file, 'utf-8'));
            } catch (e) {
                console.error(`Error reading profile for ${userId}:`, e);
            }
        }
        return {
            id: userId,
            username,
            firstSeen: Date.now(),
            lastActive: Date.now(),
            history: [],
            actionsTaken: []
        };
    }
    public static saveProfile(profile: UserProfile) {
        this.init();
        profile.lastActive = Date.now();
        const file = this.getFilePath(profile.id);
        fs.writeFileSync(file, JSON.stringify(profile, null, 2));
    }
    static getContextHistory(userId: string, limit: number = 20): AIMessage[] {
        const profile = this.getProfile(userId);
        return profile.history.slice(-limit).map(h => ({
            role: h.role as 'system' | 'user' | 'assistant',
            content: h.content
        }));
    }
    static addMessage(userId: string, username: string, role: 'system' | 'user' | 'assistant', content: any) {
        const profile = this.getProfile(userId, username);
        profile.history.push({ role, content, timestamp: Date.now() });
        this.saveProfile(profile);
    }
    static addAction(userId: string, username: string, actionName: string, data: any) {
        const profile = this.getProfile(userId, username);
        profile.actionsTaken.push({ action: actionName, data, timestamp: Date.now() });
        this.saveProfile(profile);
    }
    static clearHistory(userId: string) {
        const profile = this.getProfile(userId);
        profile.history = [];
        this.saveProfile(profile);
    }
}
