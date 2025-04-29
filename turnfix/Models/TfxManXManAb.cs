using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxManXManAb
{
    public int IntManXManAbid { get; set; }

    public int IntMannschaftenid { get; set; }

    public int IntMannschaftenAbzugid { get; set; }

    public virtual TfxMannschaften IntMannschaften { get; set; } = null!;

    public virtual TfxMannschaftenAbzug IntMannschaftenAbzug { get; set; } = null!;
}
