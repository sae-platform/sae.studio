#nullable enable
namespace SAE.STUDIO.Core.Documents;

public record DocumentMetadata
{
    public string? Title   { get; init; }
    public string? Author  { get; init; }
    public string? Subject { get; init; }
    public string? Keywords { get; init; }
    public string? Created  { get; init; }
    public string Version  { get; init; } = "2.0";
}

public record DataSourceDef
{
    public string Name { get; init; } = "";
    /// <summary>manual | json | api | excel</summary>
    public string Type { get; init; } = "manual";
    public List<string> Columns { get; init; } = [];
    /// <summary>JSON string of sample rows for Preview mode.</summary>
    public string? SampleData { get; init; }
}

public record AssetDef
{
    public string Id     { get; init; } = Guid.NewGuid().ToString();
    public string Name   { get; init; } = "";
    /// <summary>image | font | file</summary>
    public string Type   { get; init; } = "image";
    public string Source { get; init; } = "";
}

public record VariableDef
{
    public string Name { get; init; } = "";
    /// <summary>text | integer | decimal | date | boolean</summary>
    public string Type    { get; init; } = "text";
    public string? Initial   { get; init; }
    /// <summary>never | per_item | per_page</summary>
    public string? Increment { get; init; }
    public int?    Step      { get; init; }
}

/// <summary>
/// Root document model for SAE Studio v2.
/// Schema: saedocument → metadata · datasources · assets · variables · page[]
///           page → layers · header · body · footer
///           band → elements[]
/// </summary>
public record SaeDocumentModel
{
    public string Version { get; init; } = "2.0";
    public DocumentMetadata? Metadata    { get; init; }
    public List<DataSourceDef> DataSources { get; init; } = [];
    public List<AssetDef>      Assets      { get; init; } = [];
    public List<VariableDef>   Variables   { get; init; } = [];
    public List<PageDef>       Pages       { get; init; } = [];

    /// <summary>Create a blank A4 document with default bands.</summary>
    public static SaeDocumentModel CreateA4() => new()
    {
        Metadata = new DocumentMetadata { Title = "Nuevo Documento" },
        Pages =
        [
            new PageDef
            {
                Width  = PagePresets.A4.Width,
                Height = PagePresets.A4.Height,
                Unit   = "mm",
                Header = new BandDef { Type = BandType.Header, Height = 40,  CanGrow = false },
                Body   = new BandDef { Type = BandType.Body,   Height = 180, CanGrow = true  },
                Footer = new BandDef { Type = BandType.Footer, Height = 35,  CanGrow = false },
            }
        ],
    };
}
