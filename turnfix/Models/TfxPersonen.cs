using System;
using System.Collections.Generic;

namespace turnfix.Models;

public partial class TfxPersonen
{
    public int IntPersonenid { get; set; }

    public string? VarVorname { get; set; }

    public string? VarNachname { get; set; }

    public string? VarAdresse { get; set; }

    public string? VarPlz { get; set; }

    public string? VarOrt { get; set; }

    public string? VarTelefon { get; set; }

    public string? VarFax { get; set; }

    public string? VarEmail { get; set; }

    public virtual ICollection<Event> TfxVeranstaltungenIntAnsprechpartnerNavigations { get; set; } = new List<Event>();

    public virtual ICollection<Event> TfxVeranstaltungenIntMeldungAnNavigations { get; set; } = new List<Event>();

    public virtual ICollection<TfxVereine> TfxVereines { get; set; } = new List<TfxVereine>();
}
