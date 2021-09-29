import { checkQuery, handleVideos, searchTrack } from "../../utils/handlers/GeneralUtil";
import { inVC, sameVC, validVC } from "../../utils/decorators/MusicUtil";
import { DefineCommand } from "../../utils/decorators/DefineCommand";
import { CommandContext } from "../../structures/CommandContext";
import { BaseCommand } from "../../structures/BaseCommand";
import { createEmbed } from "../../utils/createEmbed";
import i18n from "../../config";

@DefineCommand({
    description: i18n.__("commands.music.play.description"),
    name: "play",
    slash: {
        description: i18n.__("commands.music.play.description"),
        name: "play",
        options: [
            {
                description: i18n.__("commands.music.play.slashQueryDescription"),
                name: "query",
                type: "STRING",
                required: true
            }
        ]
    },
    usage: i18n.__("commands.music.play.usage")
})
export class PlayCommand extends BaseCommand {
    @inVC()
    @validVC()
    @sameVC()
    public async execute(ctx: CommandContext): Promise<any> {
        if (ctx.isInteraction() && !ctx.deferred) await ctx.deferReply();

        const voiceChannel = ctx.member!.voice.channel!;
        const query = ((ctx.args.length ? ctx.args.join(" ") : undefined) ?? ctx.options?.getString("query")) ?? (ctx.additionalArgs.get("values") ? ctx.additionalArgs.get("values")[0] : undefined) as string | undefined;

        if (!query) {
            return ctx.reply({
                embeds: [createEmbed("warn", i18n.__mf("reusable.invalidUsage", { prefix: `\`${this.client.config.prefix}help\``, name: `\`${this.meta.name}\`` }))]
            });
        }

        const url = query.replace(/<(.+)>/g, "$1");
        const checkRes = checkQuery(url);

        if (ctx.guild?.queue && voiceChannel.id !== ctx.guild.queue.connection?.joinConfig.channelId) {
            return ctx.reply({ embeds: [createEmbed("warn", i18n.__mf("commands.music.play.alreadyPlaying", { voiceChannel: ctx.guild.channels.cache.get(ctx.guild.queue.connection?.joinConfig.channelId as string)?.name ?? "#unknown-channel" }))] });
        }
        if (!checkRes.isURL) {
            const newCtx = new CommandContext(ctx.context, [query]);
            return this.client.commands.get("search")!.execute(newCtx);
        }

        const songs = await searchTrack(this.client, url).catch(() => undefined);
        if (!songs || (songs.items.length <= 0)) return ctx.reply({ embeds: [createEmbed("error", i18n.__("commands.music.play.noSongData"), true)] });

        return handleVideos(this.client, ctx, songs.items, voiceChannel);
    }
}
