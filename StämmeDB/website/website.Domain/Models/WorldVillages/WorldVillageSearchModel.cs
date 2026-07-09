namespace website.Domain.Models.WorldVillages
{
    public sealed class WorldVillageSearchModel
    {
        public string? World { get; set; }

        public long? GameVillageId { get; set; }

        public string? Name { get; set; }

        public int? X { get; set; }

        public int? Y { get; set; }

        public int? Continent { get; set; }

        public long? GamePlayerId { get; set; }
    }
}
