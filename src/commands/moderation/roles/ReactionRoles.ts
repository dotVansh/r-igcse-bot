import { ReactionRole } from "@/mongo";
import { GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import { SlashCommandBuilder } from "discord.js";

export default class ReactionRolesCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("reaction_roles")
				.setDescription("Create / Delete reaction roles (for mods)")
				.addSubcommand((subcommand) =>
					subcommand
						.setName("create")
						.setDescription("Create a reaction role")
						.addStringOption((option) =>
							option
								.setName("message_id")
								.setDescription(
									"The id of the message to add the reaction role to"
								)
								.setRequired(true)
						)
						.addStringOption((option) =>
							option
								.setName("emoji")
								.setDescription("The emoji to use")
								.setRequired(true)
						)
						.addRoleOption((option) =>
							option
								.setName("role")
								.setDescription("The role to add")
								.setRequired(true)
						)
				)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		if (!interaction.channel) return;

		switch (interaction.options.getSubcommand()) {
			case "create": {
				const messageId = interaction.options.getString(
					"message_id",
					true
				);
				const emoji = interaction.options.getString("emoji", true);
				const role = interaction.options.getRole("role", true);

				const message = interaction.channel.messages.fetch(messageId);

				if (!message) {
					await interaction.reply({
						content: "Message not found",
						ephemeral: true
					});

					return;
				}

				try {
					await ReactionRole.create({
						messageId,
						emoji,
						roleId: role.id
					});

					await interaction.reply({
						content: "Reaction role created",
						ephemeral: true
					});
				} catch (error) {
					await interaction.reply({
						content: "Failed to create reaction role",
						ephemeral: true
					});

					const guildPreferences = await GuildPreferencesCache.get(
						interaction.guildId
					);

					if (!guildPreferences) {
						await interaction.reply({
							content:
								"Please setup the bot using the command `/set_preferences` first.",
							ephemeral: true
						});
						return;
					}

					client.log(error, `${this.data.name} Command`, [
						{ name: "User ID", value: interaction.user.id }
					]);
				}

				break;
			}

			default:
				break;
		}
	}
}