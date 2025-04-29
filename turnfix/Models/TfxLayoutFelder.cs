using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxLayoutFelder
{
    public int IntLayoutFelderid { get; set; }

    public int IntLayoutid { get; set; }

    public short? IntTyp { get; set; }

    public string? VarFont { get; set; }

    public float? RelX { get; set; }

    public float? RelY { get; set; }

    public float? RelW { get; set; }

    public float? RelH { get; set; }

    public string? VarValue { get; set; }

    public short? IntAlign { get; set; }

    public short? IntLayer { get; set; }

    public virtual TfxLayout IntLayout { get; set; } = null!;
}
