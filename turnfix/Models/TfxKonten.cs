using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxKonten
{
    public int IntKontenid { get; set; }

    public string? VarName { get; set; }

    public string? VarKontonummer { get; set; }

    public string? VarBlz { get; set; }

    public string? VarBank { get; set; }

    public string? VarInhabe { get; set; }

    public virtual ICollection<Event> TfxVeranstaltungens { get; set; } = new List<Event>();
}
