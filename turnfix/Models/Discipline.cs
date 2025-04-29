using System;
using System.Collections.Generic;

namespace turnfix.Models;

/*
 * TfxDisziplinen
 */
public partial class Discipline
{
    public int IntDisziplinenid { get; set; }

    public int IntSportid { get; set; }

    public string? VarName { get; set; }

    public string? VarKurz1 { get; set; }

    public string? VarKurz2 { get; set; }

    public string? VarFormel { get; set; }

    public string? VarMaske { get; set; }

    public int? IntVersuche { get; set; }

    public string? VarIcon { get; set; }

    public string? VarKuerzel { get; set; }

    public short? IntBerechnung { get; set; }

    public string? VarEinheit { get; set; }

    public bool? BolBahnen { get; set; }

    public bool? BolM { get; set; }

    public bool? BolW { get; set; }

    public int? IntFormelid { get; set; }

    public bool? BolBerechnen { get; set; }

    public virtual TfxFormeln? IntFormel { get; set; }

    public virtual TfxSport IntSport { get; set; } = null!;

    public virtual ICollection<TfxDisgrpXDisziplinen> TfxDisgrpXDisziplinens { get; set; } = new List<TfxDisgrpXDisziplinen>();

    public virtual ICollection<TfxDisziplinenFelder> TfxDisziplinenFelders { get; set; } = new List<TfxDisziplinenFelder>();

    public virtual ICollection<TfxQualiLeistungen> TfxQualiLeistungens { get; set; } = new List<TfxQualiLeistungen>();

    public virtual ICollection<TfxRiegenXDisziplinen> TfxRiegenXDisziplinens { get; set; } = new List<TfxRiegenXDisziplinen>();

    public virtual ICollection<TfxStartreihenfolge> TfxStartreihenfolges { get; set; } = new List<TfxStartreihenfolge>();

    public virtual ICollection<TfxWertungenDetail> TfxWertungenDetails { get; set; } = new List<TfxWertungenDetail>();

    public virtual ICollection<TfxWertungenXDisziplinen> TfxWertungenXDisziplinens { get; set; } = new List<TfxWertungenXDisziplinen>();

    public virtual ICollection<TfxWettkaempfeXDisziplinen> TfxWettkaempfeXDisziplinens { get; set; } = new List<TfxWettkaempfeXDisziplinen>();
}
