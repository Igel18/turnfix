using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxFormeln
{
    public int IntFormelid { get; set; }

    public string? VarName { get; set; }

    public string? VarFormel { get; set; }

    public short? IntTyp { get; set; }

    public virtual ICollection<Discipline> TfxDisziplinens { get; set; } = new List<Discipline>();
}
