using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxRiegenXDisziplinen
{
    public int IntRiegenXDisziplinenid { get; set; }

    public int IntVeranstaltungenid { get; set; }

    public int IntDisziplinenid { get; set; }

    public int IntStatusid { get; set; }

    public string? VarRiege { get; set; }

    public short? IntRunde { get; set; }

    public bool? BolErstesGeraet { get; set; }

    public virtual Discipline IntDisziplinen { get; set; } = null!;

    public virtual Status IntStatus { get; set; } = null!;

    public virtual Event IntVeranstaltungen { get; set; } = null!;
}
