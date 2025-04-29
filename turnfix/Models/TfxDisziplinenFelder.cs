using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxDisziplinenFelder
{
    public int IntDisziplinenFelderid { get; set; }

    public int IntDisziplinenid { get; set; }

    public string? VarName { get; set; }

    public short? IntSortierung { get; set; }

    public bool? BolEndwert { get; set; }

    public bool? BolAusgangswert { get; set; }

    public short? IntGruppe { get; set; }

    public bool? BolEnabled { get; set; }

    public virtual Discipline IntDisziplinen { get; set; } = null!;

    public virtual ICollection<TfxJuryResult> TfxJuryResults { get; set; } = new List<TfxJuryResult>();
}
