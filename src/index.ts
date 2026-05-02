import dotenv from 'dotenv';
import { Bot } from './core/Bot';

dotenv.config();

const bot = new Bot();
bot.start(process.env.DISCORD_TOKEN!);
