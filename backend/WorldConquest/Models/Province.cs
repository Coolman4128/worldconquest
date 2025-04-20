namespace WorldConquest.Models
{
    public class Province
    {
        public string Id { get; set; } = string.Empty;
        public Color OriginalColor { get; set; } = new Color();
        public string Owner { get; set; } = string.Empty;
        public bool IsWater { get; set; }
        public Bounds Bounds { get; set; } = new Bounds();
    }

    public class Color
    {
        public int R { get; set; }
        public int G { get; set; }
        public int B { get; set; }
    }

    public class Bounds
    {
        public int MinX { get; set; }
        public int MinY { get; set; }
        public int MaxX { get; set; }
        public int MaxY { get; set; }
    }
}