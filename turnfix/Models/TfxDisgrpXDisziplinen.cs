using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxDisgrpXDisziplinen
{
    public int IntDisgrpXDisziplinenid { get; set; }

    public int IntDisziplinenGruppenid { get; set; }

    public int IntDisziplinenid { get; set; }

    public short? IntPos { get; set; }

    public virtual Discipline IntDisziplinen { get; set; } = null!;

    public virtual TfxDisziplinenGruppen IntDisziplinenGruppen { get; set; } = null!;
}
