import dotenv from 'dotenv';
dotenv.config();
export const BOT_NAME = process.env.BOT_NAME || 'Vortex';
export const EMBED_COLOR = process.env.EMBED_COLOR || '#1E90FF';
export const EMBED_FOOTER_TEXT = process.env.EMBED_FOOTER_TEXT || `Powered by ${BOT_NAME} Engine`;
