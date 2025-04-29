using System;
using System.Collections.Generic;

namespace turnfix.Models;

/*
 * tfx_veranstaltungen
 */
public partial class Event
{
    public int IntVeranstaltungenid { get; set; }

    public int IntWettkampforteid { get; set; }

    public int? IntMeldungAn { get; set; }

    public int? IntAnsprechpartner { get; set; }

    public int? IntKontenid { get; set; }

    public int? IntHauptwettkampf { get; set; }

    public string? VarName { get; set; }

    public short? IntRunde { get; set; }

    public DateOnly DatVon { get; set; }

    public DateOnly DatBis { get; set; }

    public DateOnly? DatMeldeschluss { get; set; }

    public bool? BolRundenwettkampf { get; set; }

    public string? VarVeranstalter { get; set; }

    public short? IntEdv { get; set; }

    public short? IntHelfer { get; set; }

    public short? IntKampfrichter { get; set; }

    public string? VarMeldungWebsite { get; set; }

    public string? VarVerwendungszweck { get; set; }

    public float? RelMeldegeld { get; set; }

    public float? RelNachmeldung { get; set; }

    public bool? BolFaelligNichtantritt { get; set; }

    public bool? BolUmmeldungMoeglich { get; set; }

    public bool? BolNachmeldungMoeglich { get; set; }

    public string? TxtMeldungAn { get; set; }

    public string? TxtStartberechtigung { get; set; }

    public string? TxtTeilnahmebedingungen { get; set; }

    public string? TxtSiegerauszeichnung { get; set; }

    public string? TxtKampfrichter { get; set; }

    public string? TxtHinweise { get; set; }

    public virtual TfxPersonen? IntAnsprechpartnerNavigation { get; set; }

    public virtual Event? IntHauptwettkampfNavigation { get; set; }

    public virtual TfxKonten? IntKonten { get; set; }

    public virtual TfxPersonen? IntMeldungAnNavigation { get; set; }

    public virtual TfxWettkampforte IntWettkampforte { get; set; } = null!;

    public virtual ICollection<Event> InverseIntHauptwettkampfNavigation { get; set; } = new List<Event>();

    public virtual ICollection<TfxRiegenXDisziplinen> TfxRiegenXDisziplinens { get; set; } = new List<TfxRiegenXDisziplinen>();

    public virtual ICollection<TfxWettkaempfe> TfxWettkaempves { get; set; } = new List<TfxWettkaempfe>();
}
