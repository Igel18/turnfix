using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxMannschaftenAbzug
{
    public int IntMannschaftenAbzugid { get; set; }

    public string? VarName { get; set; }

    public float? RelAbzug { get; set; }

    public virtual ICollection<TfxManXManAb> TfxManXManAbs { get; set; } = new List<TfxManXManAb>();
}
