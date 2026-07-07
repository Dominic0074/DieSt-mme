namespace website.Infrastructure.Database.Entities
{
    public sealed class BattleReportArmyEntity
    {
        public Guid Id { get; set; }

        public Guid BattleReportId { get; set; }

        public BattleReportEntity BattleReport { get; set; } = null!;

        public BattleReportSide Side { get; set; }

        public BattleReportArmyKind Kind { get; set; } =
            BattleReportArmyKind.Combat;

        public int? SpearCount { get; set; }

        public int? SpearLosses { get; set; }

        public int? SwordCount { get; set; }

        public int? SwordLosses { get; set; }

        public int? AxeCount { get; set; }

        public int? AxeLosses { get; set; }

        public int? ArcherCount { get; set; }

        public int? ArcherLosses { get; set; }

        public int? SpyCount { get; set; }

        public int? SpyLosses { get; set; }

        public int? LightCount { get; set; }

        public int? LightLosses { get; set; }

        public int? MountedArcherCount { get; set; }

        public int? MountedArcherLosses { get; set; }

        public int? HeavyCount { get; set; }

        public int? HeavyLosses { get; set; }

        public int? RamCount { get; set; }

        public int? RamLosses { get; set; }

        public int? CatapultCount { get; set; }

        public int? CatapultLosses { get; set; }

        public int? KnightCount { get; set; }

        public int? KnightLosses { get; set; }

        public int? SnobCount { get; set; }

        public int? SnobLosses { get; set; }

        public int? MilitiaCount { get; set; }

        public int? MilitiaLosses { get; set; }
    }
}
