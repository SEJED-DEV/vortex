import { TextChannel, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { Bot } from '../core/Bot';
import { IntegrityManager } from '../utils/IntegrityManager';
import { Logger } from '../core/Logger';
import { BOT_NAME, EMBED_COLOR } from '../utils/Config';
import { PulseManager } from '../skills/GitHubPulse';

export const readyHandler = async (bot: Bot) => {
  const integrity = IntegrityManager.checkStatus();
  Logger.system(`${BOT_NAME} Manager is online. ${integrity}`);

  setInterval(() => runScheduledIntegrityCheck(bot), 30 * 60 * 1000);
  setInterval(() => runGitHubPulse(bot), 5 * 60 * 1000);
};

async function runScheduledIntegrityCheck(bot: Bot) {
  const status = IntegrityManager.checkStatus();
  if (status.includes('Alert')) {
    Logger.system('Periodic check: Integrity Alert detected.');
    for (const guild of bot.client.guilds.cache.values()) {
      const channel = guild.channels.cache.find((c) => c.name === 'ai-actions-logs' && c.isTextBased()) as TextChannel;
      if (channel) {
        try {
          const aiRes = await bot.provider.getResponse(
            `You are the ${BOT_NAME} Manager. Report the following system integrity alert clearly and concisely to server admins.`,
            [],
            `System Alert: External code modifications detected. Status: ${status}. Summarize for admins.`,
          );
          if (aiRes.text) {
            const embed = new EmbedBuilder()
              .setTitle('🛡️ System Integrity Report')
              .setDescription(aiRes.text)
              .setColor(EMBED_COLOR as any)
              .setTimestamp();
            await channel.send({ embeds: [embed] });
          }
        } catch (_e) {}
      }
    }
  }
}

async function runGitHubPulse(bot: Bot) {
  const configs = PulseManager.getConfig();
  for (const guildId of Object.keys(configs)) {
    const config = configs[guildId];
    if (!config.active) continue;

    try {
      const [owner, repo] = config.repo.split('/');
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/events?per_page=5`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
        timeout: 10000,
      });

      const events = response.data;
      if (!events || events.length === 0) continue;

      const latestEvent = events[0];
      if (config.lastCommitSha === latestEvent.id) continue;

      config.lastCommitSha = latestEvent.id;
      PulseManager.setConfig(guildId, config);

      const guild = bot.client.guilds.cache.get(guildId);
      if (!guild) continue;

      const channel = guild.channels.cache.get(config.channelId) as TextChannel;
      if (channel && channel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle(`🌐 GitHub Pulse: ${config.repo}`)
          .setURL(`https://github.com/${config.repo}`)
          .setColor(EMBED_COLOR as any)
          .setTimestamp();

        if (latestEvent.type === 'PushEvent') {
          const commits = latestEvent.payload.commits;
          const commitMsgs = commits
            .map(
              (c: any) =>
                `• [\`${c.sha.substring(0, 7)}\`](https://github.com/${config.repo}/commit/${c.sha}) ${c.message}`,
            )
            .join('\n');
          embed.setDescription(`**New Push to ${latestEvent.payload.ref.replace('refs/heads/', '')}**\n${commitMsgs}`);
        } else if (latestEvent.type === 'IssuesEvent') {
          embed.setDescription(
            `**Issue ${latestEvent.payload.action}**: [${latestEvent.payload.issue.title}](${latestEvent.payload.issue.html_url})`,
          );
        } else if (latestEvent.type === 'PullRequestEvent') {
          embed.setDescription(
            `**PR ${latestEvent.payload.action}**: [${latestEvent.payload.pull_request.title}](${latestEvent.payload.pull_request.html_url})`,
          );
        } else {
          continue;
        }
        await channel.send({ embeds: [embed] });
      }
    } catch (_e) {}
  }
}
