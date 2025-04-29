using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxVerbaende
{
    public int IntVerbaendeid { get; set; }

    public int IntLaenderid { get; set; }

    public string? VarName { get; set; }

    public string? VarKuerzel { get; set; }

    public virtual TfxLaender IntLaender { get; set; } = null!;

    public virtual ICollection<TfxGaue> TfxGaues { get; set; } = new List<TfxGaue>();
}
