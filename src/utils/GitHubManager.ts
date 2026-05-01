import axios from 'axios';

export class GitHubManager {
    private static K = process.env.INTERNAL_AUTH_KEY;
    private static R = process.env.GITHUB_REPO;

    static async createPullRequest(t: string, b: string, h: string, bs: string = 'main') {
        if (!this.K || !this.R) return 'Service unavailable.';

        try {
            const res = await axios.post(`https://api.github.com/repos/${this.R}/pulls`, {
                title: t,
                body: b,
                head: h,
                base: bs
            }, {
                headers: { 'Authorization': `token ${this.K}` }
            });
            return `Link: ${res.data.html_url}`;
        } catch (e: any) {
            return `Error: ${e.message}`;
        }
    }
}
