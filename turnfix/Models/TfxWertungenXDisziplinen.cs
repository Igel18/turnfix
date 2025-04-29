using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxWertungenXDisziplinen
{
    public int IntWertungenXDisziplinenid { get; set; }

    public int IntWertungenid { get; set; }

    public int IntDisziplinenid { get; set; }

    public virtual Discipline IntDisziplinen { get; set; } = null!;

    public virtual TfxWertungen IntWertungen { get; set; } = null!;
}
