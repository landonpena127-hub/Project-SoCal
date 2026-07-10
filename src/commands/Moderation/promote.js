import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { successEmbed, errorEmbed } from "../../utils/embeds.js";

const roles = {
    "Staff In Training": "ROLE_ID_HERE",
    "Moderation Team": "ROLE_ID_HERE",
    "Administration Team": "ROLE_ID_HERE",
    "Operations Manager": "ROLE_ID_HERE",
    "Operations Director": "ROLE_ID_HERE",
    "Director": "ROLE_ID_HERE"
};

const hierarchy = [
    "Staff In Training",
    "Moderation Team",
    "Administration Team",
    "Operations Manager",
    "Operations Director",
    "Director"
];

export default {
    data: new SlashCommandBuilder()
        .setName("promo")
        .setDescription("Promote a staff member")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to promote")
                .setRequired(true)
        )
        .addRoleOption(option =>
            option
                .setName("role")
                .setDescription("New role to give")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for promotion")
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

        await user.roles.add(role);

        return interaction.reply({
            embeds: [
                successEmbed(
                    `Promotion Complete`,
                    `${user} has been promoted to ${role}.\n\n**Reason:** ${reason}`
                )
            ]
        });
    }
};
