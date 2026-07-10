import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { successEmbed, errorEmbed } from "../../utils/embeds.js";

export default {
    data: new SlashCommandBuilder()
        .setName("demo")
        .setDescription("Demote a staff member")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to demote")
                .setRequired(true)
        )
        .addRoleOption(option =>
            option
                .setName("role")
                .setDescription("Role to remove")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for demotion")
                .setRequired(false)
        ),

    async execute(interaction) {

        const user = interaction.options.getMember("user");
        const role = interaction.options.getRole("role");
        const reason = interaction.options.getString("reason") || "No reason provided";

        if (!user) {
            return interaction.reply({
                embeds: [errorEmbed("User not found.")],
                ephemeral: true
            });
        }

        if (!user.roles.cache.has(role.id)) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        `${user.user.username} does not have that role.`
                    )
                ],
                ephemeral: true
            });
        }

        await user.roles.remove(role);

        return interaction.reply({
            embeds: [
                successEmbed(
                    `Demotion Complete`,
                    `${user} has been demoted and removed from ${role}.\n\n**Reason:** ${reason}`
                )
            ]
        });
    }
};
