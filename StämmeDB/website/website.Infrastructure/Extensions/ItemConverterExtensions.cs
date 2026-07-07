using website.Domain.Models;
using website.Infrastructure.Database.Entities;

namespace website.Infrastructure.Extensions
{
    internal static class ItemConverterExtensions
    {
        public static ItemModel ToModel(this ItemEntity entity)
        {
            ArgumentNullException.ThrowIfNull(entity);

            return new ItemModel
            {
                Id = entity.Id,
                Name = entity.Name,
                CreatedAt = entity.CreatedAt
            };
        }

        public static ItemEntity ToEntity(this ItemModel model)
        {
            ArgumentNullException.ThrowIfNull(model);

            return new ItemEntity
            {
                Id = model.Id,
                Name = model.Name,
                CreatedAt = model.CreatedAt
            };
        }
    }
}
