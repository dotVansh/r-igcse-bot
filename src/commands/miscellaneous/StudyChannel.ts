import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
	type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import Logger from "@/utils/Logger";
import {
	ActionRowBuilder,
	ButtonBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
	type APISelectMenuOption
} from "discord.js";
import { preferences } from "@/data";
import StringSelect from "@/components/setup/StringSelect";
import ChannelSelect from "@/components/setup/ChannelSelect";
import RoleSelect from "@/components/setup/RoleSelect";
import { GuildPreferencesCache } from "@/redis";
import { v4 as uuidv4 } from "uuid";
import SetupButtons from "@/components/setup/SetupButtons";
import { StudyChannel } from "@/mongo/schemas/StudyChannel";

const typeToComponent: {
	[key: string]:
		| typeof StringSelect
		| typeof ChannelSelect
		| typeof RoleSelect;
} = {
	boolean: StringSelect,
	channel: ChannelSelect,
	role: RoleSelect
};

export default class SetupCommand extends BaseCommand {
	constructor() {
		super(
			new SlashCommandBuilder()
				.setName("study_channel")
				.setDescription(
					"Create and edit study channels for your server (for admins)"
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.setDMPermission(false)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("create")
						.setDescription("Create a new study channel")
						.addChannelOption((option) =>
							option
								.setName("channel")
								.setDescription(
									"The channel to create as a study channel"
								)
								.setRequired(true)
						)
						.addRoleOption((option) =>
							option
								.setName("helper_role")
								.setDescription(
									"The helper role for this study channel"
								)
								.setRequired(true)
						)
						.addRoleOption((option) =>
							option
								.setName("study_role")
								.setDescription(
									"The study ping role for this study channel"
								)
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("edit")
						.setDescription("Edit a study channel")
						.addChannelOption((option) =>
							option
								.setName("channel")
								.setDescription("Channel to edit")
								.setRequired(true)
						)
						.addRoleOption((option) =>
							option
								.setName("helper_role")
								.setDescription(
									"The new helper role for this study channel"
								)
								.setRequired(false)
						)
						.addRoleOption((option) =>
							option
								.setName("study_role")
								.setDescription(
									"The new study ping role for this study channel"
								)
								.setRequired(false)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("delete")
						.setDescription("Delete a study channel")
						.addChannelOption((option) =>
							option
								.setName("channel")
								.setDescription("Channel to delete")
								.setRequired(true)
						)
				)
		);
	}

	async execute(
		client: DiscordClient<true>,
		interaction: DiscordChatInputCommandInteraction<"cached">
	) {
		switch (interaction.options.getSubcommand()) {
			case "create": {
				const channel = interaction.options.getChannel("channel", true);
				const helperRole = interaction.options.getRole(
					"helper_role",
					true
				);
				const studyRole = interaction.options.getRole(
					"study_role",
					true
				);

				if (
					await StudyChannel.findOne({
						guildId: interaction.guildId,
						channelId: channel.id
					})
				) {
					await interaction.reply({
						content:
							"That channel is already a study channel. To edit a study channel, use `/study_channel edit`.",
						ephemeral: true
					});
					return;
				}

				await StudyChannel.create({
					guildId: interaction.guildId,
					channelId: channel.id,
					helperRoleId: helperRole.id,
					studyPingRoleId: studyRole.id
				});

				await interaction.reply({
					content: `Study channel created: ${channel}`,
					ephemeral: true
				});
				break;
			}
			case "edit": {
				const channel = interaction.options.getChannel("channel", true);
				const helperRole = interaction.options.getRole(
					"helper_role",
					false
				);
				const studyRole = interaction.options.getRole(
					"study_role",
					false
				);

				const studyChannel = await StudyChannel.findOne({
					guildId: interaction.guildId,
					channelId: channel.id
				});

				if (!studyChannel) {
					await interaction.reply({
						content:
							"That channel is not a study channel. To create a study channel, use `/study_channel create`.",
						ephemeral: true
					});
					return;
				}

				if (helperRole) {
					studyChannel.helperRoleId = helperRole.id;
				}

				if (studyRole) {
					studyChannel.studyPingRoleId = studyRole.id;
				}

				await studyChannel.save();

				await interaction.reply({
					content: `Study channel updated: ${channel}`,
					ephemeral: true
				});
				break;
			}
			case "delete":
				const channel = interaction.options.getChannel("channel", true);

				const studyChannel = await StudyChannel.findOne({
					guildId: interaction.guildId,
					channelId: channel.id
				});

				if (!studyChannel) {
					await interaction.reply({
						content: "That channel is not a study channel.",
						ephemeral: true
					});
					return;
				}

				await studyChannel.deleteOne();

				await interaction.reply({
					content: `Study channel deleted: ${channel}`,
					ephemeral: true
				});
				break;
		}
	}
}
