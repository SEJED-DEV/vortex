import { Guild, ChannelType, PermissionsBitField } from 'discord.js';
interface ServerStructure {
  roles: Array<{ name: string; color: string; permissions: string[] }>;
  categories: Array<{
    name: string;
    channels: Array<{ name: string; type: 'text' | 'voice'; permissions?: any }>;
  }>;
}
export class ServerBuilder {
  static async build(guild: Guild, structure: ServerStructure): Promise<string[]> {
    const errors: string[] = [];
    console.log(`[DEBUG] Starting role creation...`);
    for (const roleData of structure.roles) {
      try {
        const sanitizedPermissions = roleData.permissions.map((p) => {
          if (p === 'ManageServer') return 'ManageGuild';
          return p;
        });
        await guild.roles.create({
          name: roleData.name,
          color: roleData.color as any,
          permissions: sanitizedPermissions as any,
        });
        console.log(`[DEBUG] Created role: ${roleData.name}`);
      } catch (error: any) {
        const msg = `Role "${roleData.name}": ${error.message}`;
        console.log(`[DEBUG] ${msg}`);
        errors.push(msg);
      }
    }
    console.log(`[DEBUG] Starting category and channel creation...`);
    for (const categoryData of structure.categories) {
      try {
        const category = await guild.channels.create({
          name: categoryData.name,
          type: ChannelType.GuildCategory,
        });
        console.log(`[DEBUG] Created category: ${categoryData.name}`);
        const channels = categoryData.channels || (categoryData as any).channeels || [];
        for (const channelData of channels) {
          try {
            await guild.channels.create({
              name: channelData.name,
              type: channelData.type === 'text' ? ChannelType.GuildText : ChannelType.GuildVoice,
              parent: category.id,
            });
            console.log(`[DEBUG] Created channel: ${channelData.name}`);
          } catch (error: any) {
            const msg = `Channel "${channelData.name}": ${error.message}`;
            console.log(`[DEBUG] ${msg}`);
            errors.push(msg);
          }
        }
      } catch (error: any) {
        const msg = `Category "${categoryData.name}": ${error.message}`;
        console.log(`[DEBUG] ${msg}`);
        errors.push(msg);
      }
    }
    return errors;
  }
}
