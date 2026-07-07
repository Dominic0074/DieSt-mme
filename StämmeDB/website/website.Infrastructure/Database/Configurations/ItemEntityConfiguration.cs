using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using website.Infrastructure.Database.Entities;

namespace website.Infrastructure.Database.Configurations
{
    internal sealed class ItemEntityConfiguration
        : IEntityTypeConfiguration<ItemEntity>
    {
        public void Configure(EntityTypeBuilder<ItemEntity> builder)
        {
            builder.HasKey(item => item.Id);
            builder.Property(item => item.Name)
                .HasMaxLength(200)
                .IsRequired();
            builder.HasIndex(item => item.CreatedAt);
        }
    }
}
