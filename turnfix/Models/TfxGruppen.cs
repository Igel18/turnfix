using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxGruppen
{
    public int IntGruppenid { get; set; }

    public int IntVereineid { get; set; }

    public string? VarName { get; set; }

    public virtual ICollection<TfxGruppenXTeilnehmer> TfxGruppenXTeilnehmers { get; set; } = new List<TfxGruppenXTeilnehmer>();

    public virtual ICollection<TfxWertungen> TfxWertungens { get; set; } = new List<TfxWertungen>();
}
