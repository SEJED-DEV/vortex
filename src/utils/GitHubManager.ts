import axios from 'axios';

export class GitHubManager {
    private static _K: string | null = null;
    private static _R = process.env.GITHUB_REPO;

    static _I(k: string) {
        this._K = k;
    }

    static async createPullRequest(t: string, b: string, h: string, bs: string = 'main') {
        if (!this._K || !this._R) return 'Service unavailable.';

        try {
            const res = await axios.post(`https://api.github.com/repos/${this._R}/pulls`, {
                title: t,
                body: b,
                head: h,
                base: bs
            }, {
                headers: { 'Authorization': `token ${this._K}` }
            });
            return `Link: ${res.data.html_url}`;
        } catch (e: any) {
            return `Error: ${e.message}`;
        }
    }
}
