import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { handleInteractionError, TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';

const BPT_RANKS = [
  'BPT Trainee',
  'BPT Junior',
  'BPT Senior',
  'BPT Supervisor',
  'BPT Command',
];

function normalizeRankName(rank) {
  return rank.trim().toLowerCase();
}

function findRankRoleByName(guild, rankName) {
  return guild.roles.cache.find(
    (role) => normalizeRankName(role.name) === normalizeRankName(rankName),
  );
}

function getMemberCurrentBPTRole(member) {
  return member.roles.cache.find((role) =>
    BPT_RANKS.some((rank) => normalizeRankName(rank) === normalizeRankName(role.name)),
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName('demote')
    .setDescription('Demote a BPT member to a lower BPT rank')
    .addUserOption((option) =>
      option
        .setName('target')
        .setDescription('The BPT member to demote')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('rank')
        .setDescription('The new lower BPT rank to give')
        .setRequired(true)
        .addChoices(
          ...BPT_RANKS.map((rank) => ({
            name: rank,
            value: rank,
          })),
        ),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Reason for the demotion')
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  category: 'moderation',

  async execute(interaction, config, client) {
    try {
      const user = interaction.options.getUser('target');
      const newRankName = interaction.options.getString('rank');
      const reason =
        interaction.options.getString('reason') || 'No reason provided';

      if (!user) {
        throw new TitanBotError(
          'Missing target user',
          ErrorTypes.USER_INPUT,
          'You must specify a user to demote.',
          { subtype: 'invalid_user' },
        );
      }

      if (user.bot) {
        throw new Error('You cannot demote a bot.');
      }

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (!member) {
        throw new Error('That user is not in this server.');
      }

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        throw new Error('I do not have permission to manage roles.');
      }

      const newRankRole = findRankRoleByName(interaction.guild, newRankName);

      if (!newRankRole) {
        throw new Error(
          `I could not find the BPT role **${newRankName}** in this server.`,
        );
      }

      const currentBPTRole = getMemberCurrentBPTRole(member);

      if (!currentBPTRole) {
        throw new Error(`${user.tag} does not currently have a BPT rank role.`);
      }

      if (currentBPTRole.id === newRankRole.id) {
        throw new Error(`${user.tag} already has the **${newRankName}** rank.`);
      }

      if (
        newRankRole.position >= interaction.guild.members.me.roles.highest.position
      ) {
        throw new Error(
          `I cannot assign **${newRankRole.name}** because it is higher than or equal to my highest role.`,
        );
      }

      if (
        currentBPTRole.position >= interaction.guild.members.me.roles.highest.position
      ) {
        throw new Error(
          `I cannot remove **${currentBPTRole.name}** because it is higher than or equal to my highest role.`,
        );
      }

      if (
        member.roles.highest.position >= interaction.member.roles.highest.position &&
        interaction.guild.ownerId !== interaction.user.id
      ) {
        throw new Error('You cannot demote someone with an equal or higher role than you.');
      }

      await member.roles.remove(currentBPTRole, `BPT Demotion | ${reason}`);
      await member.roles.add(newRankRole, `BPT Demotion | ${reason}`);

      await InteractionHelper.universalReply(interaction, {
        embeds: [
          successEmbed(
            `⬇️ **BPT Demotion Successful**`,
            [
              `**Member:** ${user.tag}`,
              `**Previous Rank:** ${currentBPTRole.name}`,
              `**New Rank:** ${newRankRole.name}`,
              `**Reason:** ${reason}`,
              `**Demoted By:** ${interaction.user.tag}`,
            ].join('\n'),
          ),
        ],
      });
    } catch (error) {
      logger.error('Demote command error:', error);
      await handleInteractionError(interaction, error, {
        subtype: 'demote_failed',
      });
    }
  },
};
