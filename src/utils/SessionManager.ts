import fs from 'fs';
import path from 'path';

export interface Session {
    history: string[];
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
        const data = Object.fromEntries(this.sessions);
        fs.writeFileSync(this.sessionsFile, JSON.stringify(data, null, 2));
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
        this.sessions.set(userId, session);
        this.save();
    }

    static delete(userId: string) {
        this.sessions.delete(userId);
        this.save();
    }
}

SessionManager.load();
