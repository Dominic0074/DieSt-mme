using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using website.Infrastructure.Database.Entities;

namespace website.Infrastructure.Database.Configurations
{
    internal sealed class WorldAllyEntityConfiguration
        : IEntityTypeConfiguration<WorldAllyEntity>
    {
        public void Configure(EntityTypeBuilder<WorldAllyEntity> builder)
        {
            builder.ToTable(
                "WorldAllies",
                table =>
                {
                    table.HasCheckConstraint(
                        "CK_WorldAllies_MemberCount",
                        "\"MemberCount\" IS NULL OR \"MemberCount\" >= 0");
                    table.HasCheckConstraint(
                        "CK_WorldAllies_Points",
                        "\"Points\" IS NULL OR \"Points\" >= 0");
                    table.HasCheckConstraint(
                        "CK_WorldAllies_Rank",
                        "\"Rank\" IS NULL OR \"Rank\" >= 0");
                });

            builder.HasKey(ally => ally.Id);
            builder.Property(ally => ally.World)
                .HasMaxLength(20)
                .IsRequired();
            builder.Property(ally => ally.Name)
                .HasMaxLength(200)
                .IsRequired();
            builder.Property(ally => ally.Tag)
                .HasMaxLength(50)
                .IsRequired();

            builder.HasIndex(ally => new
                {
                    ally.World,
                    ally.GameAllyId
                })
                .IsUnique();
        }
    }
}
