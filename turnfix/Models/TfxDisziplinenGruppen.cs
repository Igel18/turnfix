using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxDisziplinenGruppen
{
    public int IntDisziplinenGruppenid { get; set; }

    public string? VarName { get; set; }

    public string? TxtComment { get; set; }

    public virtual ICollection<TfxDisgrpXDisziplinen> TfxDisgrpXDisziplinens { get; set; } = new List<TfxDisgrpXDisziplinen>();
}
