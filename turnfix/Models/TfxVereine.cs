using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxVereine
{
    public int IntVereineid { get; set; }

    public int? IntPersonenid { get; set; }

    public string? VarName { get; set; }

    public short? IntStartOrt { get; set; }

    public string? VarWebsite { get; set; }

    public int IntGaueid { get; set; }

    public virtual TfxGaue IntGaue { get; set; } = null!;

    public virtual TfxPersonen? IntPersonen { get; set; }

    public virtual ICollection<TfxMannschaften> TfxMannschaftens { get; set; } = new List<TfxMannschaften>();

    public virtual ICollection<Athlete> TfxTeilnehmers { get; set; } = new List<Athlete>();
}
