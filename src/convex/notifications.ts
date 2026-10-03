"use node";
import { action } from "./_generated/server";
import { DEFAULT_ANNOUNCEMENT, type Announcement } from "../lib/store";

/**
 * Latest post from the creator's Discord announcement channel — the
 * source for the header's pop-down notification.
 *
 * Reading messages requires a bot (webhooks only push *to* Discord):
 * create a bot in the Discord Developer Portal with the Message Content
 * Intent enabled, invite it to the server with View Channel +
 * Read Message History, then put the credentials in the project's
 * Keys/API keys tab:
 *   - DISCORD_BOT_TOKEN
 *   - DISCORD_ANNOUNCEMENT_CHANNEL_ID
 *
 * Unconfigured or failing, the action returns the built-in notice so
 * the banner always has something to show.
 */
export const latest = action({
  args: {},
  handler: async (): Promise<Announcement> => {
    const token = process.env.DISCORD_BOT_TOKEN;
    const channelId = process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID;
    if (!token || !channelId) return DEFAULT_ANNOUNCEMENT; // not set up yet

    try {
      const headers = { authorization: `Bot ${token}` };
      const response = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages?limit=1`,
        { headers },
      );
      if (!response.ok) return DEFAULT_ANNOUNCEMENT;

      const messages = (await response.json()) as Array<{
        id: string;
        content: string;
        timestamp: string;
        guild_id?: string;
      }>;
      const message = messages[0];
      if (!message?.content.trim()) return DEFAULT_ANNOUNCEMENT;

      // Single-line preview for the banner.
      const flat = message.content.replace(/\s+/g, " ").trim();
      const text =
        flat.length > 240 ? `${flat.slice(0, 240).trimEnd()}…` : flat;

      // The deep link needs the guild id; messages don't carry it, so
      // ask the channel object once (cheap, same bot credentials).
      let guildId = message.guild_id ?? "";
      if (!guildId) {
        const channel = await fetch(
          `https://discord.com/api/v10/channels/${channelId}`,
          { headers },
        );
        if (channel.ok) {
          const info = (await channel.json()) as { guild?: { id?: string } };
          guildId = info.guild?.id ?? "";
        }
      }

      return {
        text,
        url: guildId
          ? `https://discord.com/channels/${guildId}/${channelId}/${message.id}`
          : "",
        timestamp: message.timestamp,
        source: "discord",
      };
    } catch {
      return DEFAULT_ANNOUNCEMENT; // offline or unreachable — keep showing
    }
  },
});
