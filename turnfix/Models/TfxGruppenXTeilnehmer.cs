using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxGruppenXTeilnehmer
{
    public int IntGruppenXTeilnehmerid { get; set; }

    public int IntGruppenid { get; set; }

    public int IntTeilnehmerid { get; set; }

    public virtual TfxGruppen IntGruppen { get; set; } = null!;

    public virtual Athlete IntTeilnehmer { get; set; } = null!;
}
