using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxWertungenDetail
{
    public int IntWertungenDetailsid { get; set; }

    public int IntWertungenid { get; set; }

    public int IntDisziplinenid { get; set; }

    public short? IntVersuch { get; set; }

    public float? RelLeistung { get; set; }

    public short? IntKp { get; set; }

    public virtual Discipline IntDisziplinen { get; set; } = null!;

    public virtual TfxWertungen IntWertungen { get; set; } = null!;
}
