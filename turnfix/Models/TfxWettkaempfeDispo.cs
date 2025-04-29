using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxWettkaempfeDispo
{
    public int IntWettkaempfeDisposid { get; set; }

    public int IntWettkaempfeXDisziplinenid { get; set; }

    public short? IntSortx { get; set; }

    public short? IntSorty { get; set; }

    public short? IntKp { get; set; }

    public virtual TfxWettkaempfeXDisziplinen IntWettkaempfeXDisziplinen { get; set; } = null!;
}
