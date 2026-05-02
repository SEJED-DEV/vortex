import { Message, EmbedBuilder, PermissionsBitField, TextChannel } from 'discord.js';
import { Bot } from '../core/Bot';
import { SessionManager } from '../utils/SessionManager';
import { SkillManager } from '../skills/SkillManager';
import { ManagementManager } from '../utils/ManagementManager';
import { LevelManager } from '../skills/LevelingSystem';
import { TriggerManager } from '../skills/AutoResponder';
import { VisionService } from '../services/VisionService';
import { PromptService } from '../services/PromptService';
import { Logger } from '../core/Logger';
import { DEV_ID, MOD_ACTIONS } from '../core/Constants';
import { BOT_NAME, EMBED_COLOR, EMBED_FOOTER_TEXT } from '../utils/Config';
import { AIResponse, VisionContent } from '../providers/ProviderManager';

export const messageCreateHandler = async (bot: Bot, message: Message) => {
  if (message.author.bot || message.system || !bot.client.user || !message.guild || !message.member) return;

  // Leveling System
  const xpAmount = Math.floor(Math.random() * 10) + 15;
  const { leveledUp, newLevel } = await LevelManager.addXP(message.member, xpAmount);
  if (leveledUp) {
    const levelEmbed = new EmbedBuilder()
      .setTitle('🎊 Level Up!')
      .setDescription(`Congratulations <@${message.author.id}>! You've reached **Level ${newLevel}**!`)
      .setColor(EMBED_COLOR as any)
      .setTimestamp();
    await (message.channel as TextChannel).send({ embeds: [levelEmbed] });
  }

  // Auto Responder
  const triggers = TriggerManager.getTriggers();
  const lowerMsg = message.content.toLowerCase();
  for (const t of triggers) {
    let isMatch = false;
    if (t.isRegex) {
      try {
        const regex = new RegExp(t.trigger, 'i');
        isMatch = regex.test(message.content);
      } catch (_e) {}
    } else {
      isMatch = lowerMsg.includes(t.trigger);
    }

    if (isMatch) {
      const now = Date.now();
      const lastFired = TriggerManager.cooldowns.get(t.id) || 0;
      if (now - lastFired > 30000) {
        TriggerManager.cooldowns.set(t.id, now);
        const randomResponse = t.responses[Math.floor(Math.random() * t.responses.length)];
        await message.reply(randomResponse);
      }
      break;
    }
  }

  const rawContent = message.content || '';
  const input = rawContent.replace(`<@!${bot.client.user.id}>`, '').replace(`<@${bot.client.user.id}>`, '').trim();

  // About/Credits
  if (input.toLowerCase() === 'credits' || input.toLowerCase() === 'about') {
    const embed = new EmbedBuilder()
      .setTitle(`${BOT_NAME} Bot Credits`)
      .setDescription(`${BOT_NAME} is an advanced AI-driven server management system.`)
      .addFields(
        { name: 'Developer', value: 'Sejed TRABELSSI', inline: true },
        {
          name: 'Instagram',
          value: '[@http.sejed.official](https://www.instagram.com/http.sejed.official/)',
          inline: true,
        },
        { name: 'Support', value: '[Discord Server](https://discord.gg/pun3PXXDuE)', inline: true },
        { name: 'GitHub', value: '[SEJED-DEV/vortex](https://github.com/SEJED-DEV/vortex)', inline: true },
      )
      .setColor(EMBED_COLOR as any)
      .setFooter({ text: EMBED_FOOTER_TEXT });
    return message.reply({ embeds: [embed] });
  }

  const isMentioned = message.mentions.has(bot.client.user);
  const isSpamChannel =
    (message.channel as any).name?.toLowerCase().includes('ai') ||
    (message.channel as any).name?.toLowerCase().includes('spam') ||
    (message.channel as any).name?.toLowerCase().includes('bot');
  const profile = SessionManager.getProfile(message.author.id, message.author.username);
  const isActiveConversation = Date.now() - profile.lastActive < 180000;

  const imageAttachment = VisionService.extractImageAttachment(message);
  const hasImage = !!imageAttachment;
  const triggerByImage = hasImage && isSpamChannel;

  if (isMentioned || isSpamChannel || isActiveConversation || triggerByImage) {
    if (input.toLowerCase() === 'reset') {
      SessionManager.clearHistory(message.author.id);
      return message.reply('🧹 Memory cleared. Starting fresh!');
    }

    const isDev = message.author.id === DEV_ID;
    const isStaff =
      isDev ||
      message.member?.permissions.has(PermissionsBitField.Flags.Administrator) ||
      message.member?.roles.cache.some((r) =>
        ['staff', 'moderator', 'support', 'admin', 'mod'].includes(r.name.toLowerCase()),
      );

    const visionContent: VisionContent | undefined =
      imageAttachment ||
      VisionService.extractImageFromEmbeds(message) ||
      (input ? VisionService.extractUrlImage(input) : undefined);

    if (message.channel.isTextBased()) await (message.channel as any).sendTyping();

    let userMessage = input;
    if (visionContent && !userMessage) {
      userMessage = 'I sent you an image. Please describe and analyse it.';
    } else if (visionContent && userMessage) {
      userMessage = `${userMessage} [Image attached]`;
    }

    const historyForAI = SessionManager.getContextHistory(message.author.id, 20);
    SessionManager.addMessage(message.author.id, message.author.username, 'user', userMessage || '[image]');

    const systemPrompt = PromptService.buildSystemPrompt(message, !!isStaff, hasImage);

    try {
      const aiRes: AIResponse = await bot.provider.getResponse(systemPrompt, historyForAI, userMessage, visionContent);

      if (!aiRes.text) throw new Error('Empty response from AI.');
      Logger.system(`AI (${aiRes.model}): ${aiRes.text.substring(0, 80)}...`);

      const rawText = aiRes.text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      let result: any = null;

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0]);
        } catch (_e) {
          try {
            const cleaned = jsonMatch[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
            result = JSON.parse(cleaned);
          } catch (_e2) {}
        }
      }

      if (!result || !result.action) {
        if (rawText.length > 2 && !rawText.trim().startsWith('{')) {
          result = { action: 'chat', message: rawText };
        } else {
          throw new Error('Could not parse a valid action from AI response.');
        }
      }

      if (result.action === 'ignore') return;

      if (MOD_ACTIONS.includes(result.action) && !isStaff) {
        const isSelfWarn = result.action === 'warn' && result.data?.userId === message.author.id;
        if (!isSelfWarn) {
          SessionManager.addMessage(message.author.id, message.author.username, 'assistant', 'Access denied.');
          return message.reply('🚫 **Access Denied**: Staff authorization required for that action.');
        }
      }

      if (result.action === 'ask') {
        const q = result.question || result.message || 'I need more information.';
        SessionManager.addMessage(message.author.id, message.author.username, 'assistant', q);
        return message.reply(appendMetadata(q, aiRes.model));
      } else if (result.action === 'chat') {
        const msg = result.message || result.text || result.response || 'I processed your request.';
        SessionManager.addMessage(message.author.id, message.author.username, 'assistant', msg);

        const fullMsg = appendMetadata(msg, aiRes.model);
        if (fullMsg.length > 1990) {
          const chunks = fullMsg.match(/.{1,1990}/gs) || [fullMsg];
          for (let i = 0; i < chunks.length; i++) {
            await (message.channel as TextChannel).send(chunks[i]);
          }
        } else {
          await message.reply(fullMsg);
        }
      } else if (SkillManager.hasSkill(result.action)) {
        Logger.system(`Skill: ${result.action}`);
        const statusMsg = await message.reply(`⚙️ **${BOT_NAME} is processing**: \`${result.action}\`...`);

        try {
          const skillRes = await SkillManager.execute(result.action, message, result.data || {});
          await statusMsg.delete().catch(() => {});

          let finalResponse: any = skillRes;

          if (typeof skillRes === 'string' || (typeof skillRes === 'object' && !(skillRes as any).embeds)) {
            const rawData = typeof skillRes === 'string' ? skillRes : JSON.stringify(skillRes);

            Logger.system(`Narrating skill result...`);
            const narrationRes = await bot.provider.getResponse(
              PromptService.buildNarrationPrompt(result.action, rawData),
              [],
              `Present the result of ${result.action} to the user.`,
            );

            if (narrationRes.text) {
              finalResponse = narrationRes.text;
            }
          }

          SessionManager.addMessage(
            message.author.id,
            message.author.username,
            'assistant',
            `Executed ${result.action}. Result explained to user.`,
          );
          SessionManager.addAction(message.author.id, message.author.username, result.action, result.data || {});

          if (typeof finalResponse === 'string') {
            const fullMsg = appendMetadata(finalResponse, aiRes.model, result.action);
            if (fullMsg.length > 1990) {
              const chunks = fullMsg.match(/.{1,1990}/gs) || [fullMsg];
              for (let i = 0; i < chunks.length; i++) {
                await (message.channel as TextChannel).send(chunks[i]);
              }
            } else {
              await message.reply(fullMsg);
            }
          } else {
            const payload = finalResponse as any;
            const showModel = process.env.SHOW_AI_MODEL !== 'false';
            const showSkill = process.env.SHOW_SKILL_USED !== 'false';

            if ((showModel || showSkill) && Array.isArray(payload?.embeds) && payload.embeds[0]) {
              try {
                const existing = payload.embeds[0].data?.footer?.text || '';
                let footerParts = [];
                if (showSkill) footerParts.push(`Skill: ${result.action}`);
                if (showModel) footerParts.push(`Model: ${aiRes.model}`);

                payload.embeds[0].setFooter({
                  text: `${existing ? existing + ' • ' : ''}${footerParts.join(' • ')}`,
                });
              } catch (_unused) {}
            }
            await message.reply(payload);
          }
        } catch (error: any) {
          await statusMsg.delete().catch(() => {});
          await message.reply(`❌ **Skill Error**: Failed to execute \`${result.action}\`. Error: ${error.message}`);
        }
      } else if (MOD_ACTIONS.includes(result.action)) {
        Logger.system(`Mod: ${result.action}`);
        const modRes = await ManagementManager.execute(message, result.action, result.data || {});

        // Narrate the moderation result
        Logger.system(`Narrating mod result...`);
        const narrationRes = await bot.provider.getResponse(
          PromptService.buildNarrationPrompt(result.action, modRes),
          [],
          `Present the moderation result of ${result.action} to the user.`,
        );

        const finalMsg = narrationRes.text || modRes;

        SessionManager.addMessage(
          message.author.id,
          message.author.username,
          'assistant',
          `Action ${result.action} done. Result narrated to user.`,
        );
        SessionManager.addAction(message.author.id, message.author.username, result.action, result.data || {});

        try {
          const reply = appendMetadata(finalMsg, aiRes.model, result.action);
          if (result.action === 'purge') {
            await (message.channel as any).send(reply);
          } else {
            await message.reply(reply);
          }
        } catch (_e: any) {
          Logger.system(`Reply Err: ${_e.message}`);
        }
      } else {
        SessionManager.addMessage(message.author.id, message.author.username, 'assistant', 'Unknown action.');
        await message.reply(`⚠️ Unknown action: \`${result.action}\``);
      }
    } catch (error: any) {
      Logger.system(`ERR: ${error.message}`);
      SessionManager.addMessage(message.author.id, message.author.username, 'assistant', `Error: ${error.message}`);
      await message.reply(`⚠️ **${BOT_NAME} Error:** ${error.message}`).catch(() => {});
    }
  }
};

function appendMetadata(text: string, model: string, skill?: string): string {
  const showModel = process.env.SHOW_AI_MODEL !== 'false';
  const showSkill = process.env.SHOW_SKILL_USED !== 'false';

  let footer = '';
  if (showSkill && skill) footer += `Skill: **${skill}**`;
  if (showModel) footer += `${footer ? ' • ' : ''}Used **${model}**`;

  if (!footer) return text;
  return `${text}\n-# ${footer}`;
}
