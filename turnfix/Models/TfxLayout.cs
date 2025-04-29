using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxLayout
{
    public int IntLayoutid { get; set; }

    public string? VarName { get; set; }

    public string? TxtComment { get; set; }

    public virtual ICollection<TfxLayoutFelder> TfxLayoutFelders { get; set; } = new List<TfxLayoutFelder>();
}
