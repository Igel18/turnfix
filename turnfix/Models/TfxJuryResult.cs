using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxJuryResult
{
    public int IntJuryresultsid { get; set; }

    public int? IntWertungenid { get; set; }

    public int? IntDisziplinenFelderid { get; set; }

    public short? IntVersuch { get; set; }

    public float? RelLeistung { get; set; }

    public short? IntKp { get; set; }

    public virtual TfxDisziplinenFelder? IntDisziplinenFelder { get; set; }

    public virtual TfxWertungen? IntWertungen { get; set; }
}
