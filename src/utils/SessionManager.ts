import fs from 'fs';
import path from 'path';
import { AIMessage } from '../providers/ProviderManager';

export interface Session {
    history: AIMessage[];
    lastActivity: number;
}

export class SessionManager {
    private static sessionsFile = path.join(__dirname, '../../sessions.json');
    private static sessions: Map<string, Session> = new Map();

    static load() {
        if (fs.existsSync(this.sessionsFile)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.sessionsFile, 'utf-8'));
                this.sessions = new Map(Object.entries(data));
            } catch (e) {}
        }
    }

    private static save() {
        try {
            const data = Object.fromEntries(this.sessions);
            fs.writeFileSync(this.sessionsFile, JSON.stringify(data, null, 2));
        } catch (e) {}
    }

    static has(userId: string): boolean {
        return this.sessions.has(userId);
    }

    static get(userId: string): Session {
        if (!this.sessions.has(userId)) {
            this.sessions.set(userId, { history: [], lastActivity: 0 });
            this.save();
        }
        return this.sessions.get(userId)!;
    }

    static set(userId: string, session: Session) {
        session.lastActivity = Date.now();
        // Cap history at 20 messages to keep context manageable
        if (session.history.length > 20) {
            session.history = session.history.slice(-20);
        }
        this.sessions.set(userId, session);
        this.save();
    }

    static delete(userId: string) {
        this.sessions.delete(userId);
        this.save();
    }
}

SessionManager.load();
