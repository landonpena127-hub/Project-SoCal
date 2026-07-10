import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { handleInteractionError, TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';

const BPT_RANKS = [
  'Staff In Training',
  'Moderation Team',
  'Administration Team',
  'Operations Manager',
  'Operations Director',
  'Director',
];

function normalize(str) {
  return str.trim().toLowerCase();
}

function getBPTRoleObjects(guild) {
  return BPT_RANKS.map((rankName) => {
    const role = guild.roles.cache.find(
      (r) => normalize(r.name) === normalize(rankName),
    );
    return { name: rankName, role };
  });
}

function getCurrentBPTRank(member, guild) {
  const rankRoles = getBPTRoleObjects(guild);

  for (let i = rankRoles.length - 1; i >= 0; i--) {
    const rankRole = rankRoles[i].role;
    if (rankRole && member.roles.cache.has(rankRole.id)) {
      return {
        index: i,
        name: rankRoles[i].name,
        role: rankRole,
      };
    }
  }

  return null;
}

export default {
  data: new SlashCommandBuilder()
    .setName('demote')
    .setDescription('Demote a BPT member down one rank')
    .addUserOption((option) =>
      option
        .setName('target')
        .setDescription('The member to demote')
        .setRequired(true),
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

      const rankRoles = getBPTRoleObjects(interaction.guild);
      const missingRoles = rankRoles.filter((r) => !r.role).map((r) => r.name);
      if (missingRoles.length > 0) {
        throw new Error(
          `These BPT roles were not found in your server: ${missingRoles.join(', ')}`,
        );
      }

      const currentRank = getCurrentBPTRank(member, interaction.guild);
      if (!currentRank) {
        throw new Error(`${user.tag} does not currently have a BPT rank role.`);
      }

      if (currentRank.index <= 0) {
        throw new Error(`${user.tag} is already at the lowest BPT rank.`);
      }

      const newRank = rankRoles[currentRank.index - 1];

      if (
        newRank.role.position >= interaction.guild.members.me.roles.highest.position
      ) {
        throw new Error(
          `I cannot assign **${newRank.role.name}** because it is higher than or equal to my highest role.`,
        );
      }

      if (
        currentRank.role.position >= interaction.guild.members.me.roles.highest.position
      ) {
        throw new Error(
          `I cannot remove **${currentRank.role.name}** because it is higher than or equal to my highest role.`,
        );
      }

      if (
        member.roles.highest.position >= interaction.member.roles.highest.position &&
        interaction.guild.ownerId !== interaction.user.id
      ) {
        throw new Error('You cannot demote someone with an equal or higher role than you.');
      }

      await member.roles.remove(currentRank.role, `BPT Demotion | ${reason}`);
      await member.roles.add(newRank.role, `BPT Demotion | ${reason}`);

      await InteractionHelper.universalReply(interaction, {
        embeds: [
          successEmbed(
            '⬇️ **BPT Demotion Successful**',
            [
              `**Member:** ${user.tag}`,
              `**Previous Rank:** ${currentRank.role.name}`,
              `**New Rank:** ${newRank.role.name}`,
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
