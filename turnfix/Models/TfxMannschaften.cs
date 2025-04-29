using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxMannschaften
{
    public int IntMannschaftenid { get; set; }

    public int IntWettkaempfeid { get; set; }

    public int IntVereineid { get; set; }

    public short? IntNummer { get; set; }

    public string? VarRiege { get; set; }

    public int? IntStartnummer { get; set; }

    public virtual TfxVereine IntVereine { get; set; } = null!;

    public virtual TfxWettkaempfe IntWettkaempfe { get; set; } = null!;

    public virtual ICollection<TfxManXManAb> TfxManXManAbs { get; set; } = new List<TfxManXManAb>();

    public virtual ICollection<TfxManXTeilnehmer> TfxManXTeilnehmers { get; set; } = new List<TfxManXTeilnehmer>();

    public virtual ICollection<TfxWertungen> TfxWertungens { get; set; } = new List<TfxWertungen>();
}
