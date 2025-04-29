using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxWettkampforte
{
    public int IntWettkampforteid { get; set; }

    public string? VarName { get; set; }

    public string? VarAdresse { get; set; }

    public string? VarPlz { get; set; }

    public string? VarOrt { get; set; }

    public virtual ICollection<Event> TfxVeranstaltungens { get; set; } = new List<Event>();
}
