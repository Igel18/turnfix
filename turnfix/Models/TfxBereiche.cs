using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxBereiche
{
    public int IntBereicheid { get; set; }

    public string? VarName { get; set; }

    public bool? BolMaennlich { get; set; }

    public bool? BolWeiblich { get; set; }

    public virtual ICollection<TfxWettkaempfe> TfxWettkaempves { get; set; } = new List<TfxWettkaempfe>();
}
