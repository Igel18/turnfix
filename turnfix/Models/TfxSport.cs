using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxSport
{
    public int IntSportid { get; set; }

    public string? VarName { get; set; }

    public virtual ICollection<Discipline> TfxDisziplinens { get; set; } = new List<Discipline>();
}
