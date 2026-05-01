import fs from 'fs';
import path from 'path';

interface Warning {
    id: string;
    userId: string;
    reason: string;
    staffId: string;
    timestamp: number;
}

export class WarnManager {
    private static FILE_PATH = path.join(process.cwd(), 'data', 'warnings.json');

    private static init() {
        const dir = path.dirname(this.FILE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(this.FILE_PATH)) fs.writeFileSync(this.FILE_PATH, JSON.stringify([]));
    }

    public static async addWarning(userId: string, staffId: string, reason: string): Promise<number> {
        this.init();
        const warns: Warning[] = JSON.parse(fs.readFileSync(this.FILE_PATH, 'utf-8'));
        
        warns.push({
            id: Math.random().toString(36).substr(2, 9),
            userId,
            staffId,
            reason,
            timestamp: Date.now()
        });

        fs.writeFileSync(this.FILE_PATH, JSON.stringify(warns, null, 2));
        return warns.filter(w => w.userId === userId).length;
    }

    public static getWarnings(userId: string): Warning[] {
        this.init();
        const warns: Warning[] = JSON.parse(fs.readFileSync(this.FILE_PATH, 'utf-8'));
        return warns.filter(w => w.userId === userId);
    }

    public static clearWarnings(userId: string): void {
        this.init();
        let warns: Warning[] = JSON.parse(fs.readFileSync(this.FILE_PATH, 'utf-8'));
        warns = warns.filter(w => w.userId !== userId);
        fs.writeFileSync(this.FILE_PATH, JSON.stringify(warns, null, 2));
    }
}
