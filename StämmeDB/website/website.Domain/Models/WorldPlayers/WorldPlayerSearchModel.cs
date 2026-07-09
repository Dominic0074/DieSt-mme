namespace website.Domain.Models.WorldPlayers
{
    public sealed class WorldPlayerSearchModel
    {
        public string? World { get; set; }

        public long? GamePlayerId { get; set; }

        public string? Name { get; set; }

        public long? GameAllyId { get; set; }
    }
}
