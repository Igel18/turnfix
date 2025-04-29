using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxLaender
{
    public int IntLaenderid { get; set; }

    public string? VarName { get; set; }

    public string? VarKuerzel { get; set; }

    public virtual ICollection<TfxVerbaende> TfxVerbaendes { get; set; } = new List<TfxVerbaende>();
}
