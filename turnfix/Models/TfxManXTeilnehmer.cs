using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxManXTeilnehmer
{
    public int IntManXTeilnehmerid { get; set; }

    public int IntMannschaftenid { get; set; }

    public int IntTeilnehmerid { get; set; }

    public short? IntRunde { get; set; }

    public virtual TfxMannschaften IntMannschaften { get; set; } = null!;

    public virtual Athlete IntTeilnehmer { get; set; } = null!;
}
