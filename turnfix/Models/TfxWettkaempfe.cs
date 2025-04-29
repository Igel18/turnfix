using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxWettkaempfe
{
    public int IntWettkaempfeid { get; set; }

    public int IntVeranstaltungenid { get; set; }

    public int IntBereicheid { get; set; }

    public short? IntTyp { get; set; }

    public string? VarNummer { get; set; }

    public string? VarName { get; set; }

    public short YerVon { get; set; }

    public short? YerBis { get; set; }

    public short? IntQualifikation { get; set; }

    public short? IntWertungen { get; set; }

    public bool? BolStreichwertung { get; set; }

    public bool? BolAkAnzeigen { get; set; }

    public bool? BolWahlwettkampf { get; set; }

    public short? IntDurchgang { get; set; }

    public short? IntBahn { get; set; }

    public TimeOnly? TimStartzeit { get; set; }

    public TimeOnly? TimEinturnen { get; set; }

    public bool? BolInfoAnzeigen { get; set; }

    public bool? BolKp { get; set; }

    public bool? BolSortasc { get; set; }

    public bool? BolMansort { get; set; }

    public bool? BolGerpkt { get; set; }

    public short? IntAnzStreich { get; set; }

    public virtual TfxBereiche IntBereiche { get; set; } = null!;

    public virtual Event IntVeranstaltungen { get; set; } = null!;

    public virtual ICollection<TfxMannschaften> TfxMannschaftens { get; set; } = new List<TfxMannschaften>();

    public virtual ICollection<TfxWertungen> TfxWertungens { get; set; } = new List<TfxWertungen>();

    public virtual ICollection<TfxWettkaempfeXDisziplinen> TfxWettkaempfeXDisziplinens { get; set; } = new List<TfxWettkaempfeXDisziplinen>();
}
