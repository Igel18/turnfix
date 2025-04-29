using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxWettkaempfeXDisziplinen
{
    public int IntWettkaempfeXDisziplinenid { get; set; }

    public int IntWettkaempfeid { get; set; }

    public int IntDisziplinenid { get; set; }

    public string? VarAusschreibung { get; set; }

    public short? IntSortierung { get; set; }

    public bool? BolKp { get; set; }

    public float? RelMax { get; set; }

    public virtual Discipline IntDisziplinen { get; set; } = null!;

    public virtual TfxWettkaempfe IntWettkaempfe { get; set; } = null!;

    public virtual ICollection<TfxWettkaempfeDispo> TfxWettkaempfeDispos { get; set; } = new List<TfxWettkaempfeDispo>();
}
