using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxGaue
{
    public int IntGaueid { get; set; }

    public int IntVerbaendeid { get; set; }

    public string? VarName { get; set; }

    public string? VarKuerzel { get; set; }

    public virtual TfxVerbaende IntVerbaende { get; set; } = null!;

    public virtual ICollection<TfxVereine> TfxVereines { get; set; } = new List<TfxVereine>();
}
