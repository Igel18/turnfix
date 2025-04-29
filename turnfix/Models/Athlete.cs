using System;
using System.Collections.Generic;

namespace turnfix.Models;

/*
 * Db Table TfxTeilnehmer
 */
public partial class Athlete
{
    public int IntTeilnehmerid { get; set; }

    public int IntVereineid { get; set; }

    public string? VarVorname { get; set; }

    public string? VarNachname { get; set; }

    public short IntGeschlecht { get; set; }

    public DateOnly? DatGeburtstag { get; set; }

    public bool? BoolNurJahr { get; set; }

    public int? IntStartpassnummer { get; set; }

    public virtual TfxVereine IntVereine { get; set; } = null!;

    public virtual ICollection<TfxGruppenXTeilnehmer> TfxGruppenXTeilnehmers { get; set; } = new List<TfxGruppenXTeilnehmer>();

    public virtual ICollection<TfxManXTeilnehmer> TfxManXTeilnehmers { get; set; } = new List<TfxManXTeilnehmer>();

    public virtual ICollection<TfxWertungen> TfxWertungens { get; set; } = new List<TfxWertungen>();
}
