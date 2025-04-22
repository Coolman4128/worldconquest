using System;

namespace WorldConquest.Models
{
    public enum DiplomaticStatus
    {
        Neutral,
        AtWar,
        Allies,
        DefensiveAlliance,
        Truce
    }

    public class DiplomaticRelation
    {
        // Unique Id for the relation (could be composite of both country ids)
        public string Id { get; set; }

        // First country in the relation
        public string CountryAId { get; set; }

        // Second country in the relation
        public string CountryBId { get; set; }

        // Current status of the relation
        public DiplomaticStatus Status { get; set; }

        // If there is a truce, when does it end (null if not in truce)
        public DateTime? TruceEndDate { get; set; }
    }
}