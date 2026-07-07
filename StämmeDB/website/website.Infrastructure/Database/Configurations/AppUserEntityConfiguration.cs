using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using website.Infrastructure.Database.Entities;

namespace website.Infrastructure.Database.Configurations
{
    internal sealed class AppUserEntityConfiguration
        : IEntityTypeConfiguration<AppUserEntity>
    {
        public void Configure(EntityTypeBuilder<AppUserEntity> builder)
        {
            builder.ToTable("AppUsers");

            builder.HasKey(user => user.Id);
            builder.Property(user => user.LoginEmail)
                .HasMaxLength(320)
                .IsRequired();
            builder.Property(user => user.PasswordHash)
                .HasMaxLength(500)
                .IsRequired();

            builder.HasIndex(user => user.LoginEmail)
                .IsUnique();
        }
    }
}
