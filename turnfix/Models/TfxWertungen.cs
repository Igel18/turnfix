using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxWertungen
{
    public int IntWertungenid { get; set; }

    public int IntWettkaempfeid { get; set; }

    public int? IntTeilnehmerid { get; set; }

    public int? IntGruppenid { get; set; }

    public int? IntMannschaftenid { get; set; }

    public int IntStatusid { get; set; }

    public short? IntRunde { get; set; }

    public int? IntStartnummer { get; set; }

    public bool? BolAk { get; set; }

    public bool? BolStartetNicht { get; set; }

    public string? VarRiege { get; set; }

    public string? VarComment { get; set; }

    public virtual TfxGruppen? IntGruppen { get; set; }

    public virtual TfxMannschaften? IntMannschaften { get; set; }

    public virtual Status IntStatus { get; set; } = null!;

    public virtual Athlete? IntTeilnehmer { get; set; }

    public virtual TfxWettkaempfe IntWettkaempfe { get; set; } = null!;

    public virtual ICollection<TfxJuryResult> TfxJuryResults { get; set; } = new List<TfxJuryResult>();

    public virtual ICollection<TfxQualiLeistungen> TfxQualiLeistungens { get; set; } = new List<TfxQualiLeistungen>();

    public virtual ICollection<TfxStartreihenfolge> TfxStartreihenfolges { get; set; } = new List<TfxStartreihenfolge>();

    public virtual ICollection<TfxWertungenDetail> TfxWertungenDetails { get; set; } = new List<TfxWertungenDetail>();

    public virtual ICollection<TfxWertungenXDisziplinen> TfxWertungenXDisziplinens { get; set; } = new List<TfxWertungenXDisziplinen>();
}
