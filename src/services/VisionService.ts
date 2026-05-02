import { Message, Attachment } from 'discord.js';
import { VisionContent } from '../providers/ProviderManager';
import { SUPPORTED_IMAGE_TYPES } from '../core/Constants';

export class VisionService {
  public static extractImageAttachment(message: Message): VisionContent | undefined {
    const attachment = message.attachments.find(
      (a: Attachment) => a.contentType && SUPPORTED_IMAGE_TYPES.includes(a.contentType.split(';')[0]),
    );
    if (!attachment || !attachment.contentType) return undefined;
    return {
      imageUrl: attachment.url,
      mimeType: attachment.contentType.split(';')[0],
    };
  }

  public static extractImageFromEmbeds(message: Message): VisionContent | undefined {
    for (const embed of message.embeds) {
      if (embed.image?.url) {
        return { imageUrl: embed.image.url, mimeType: 'image/jpeg' };
      }
      if (embed.thumbnail?.url) {
        return { imageUrl: embed.thumbnail.url, mimeType: 'image/jpeg' };
      }
    }
    return undefined;
  }

  public static extractUrlImage(text: string): VisionContent | undefined {
    const imageUrlRegex = /https?:\/\/\S+\.(jpg|jpeg|png|gif|webp)(\?[^\s]*)?\b/i;
    const match = text.match(imageUrlRegex);
    if (match) {
      const ext = match[1].toLowerCase();
      const mimeMap: { [k: string]: string } = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      };
      return { imageUrl: match[0], mimeType: mimeMap[ext] || 'image/jpeg' };
    }
    return undefined;
  }
}
