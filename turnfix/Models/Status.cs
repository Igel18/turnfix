using System;
using System.Collections.Generic;

namespace turnfix.Models;

/*
 *TfxStatus
 */
public partial class Status
{
    public int IntStatusid { get; set; }

    public string? VarName { get; set; }

    public string? AryColorcode { get; set; }

    public bool? BolBogen { get; set; }

    public bool? BolKarte { get; set; }

    public virtual ICollection<TfxRiegenXDisziplinen> TfxRiegenXDisziplinens { get; set; } = new List<TfxRiegenXDisziplinen>();

    public virtual ICollection<TfxWertungen> TfxWertungens { get; set; } = new List<TfxWertungen>();
}
