using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace turnfix.Models;

public partial class TurnfixContext : DbContext
{
    public TurnfixContext()
    {
    }

    public TurnfixContext(DbContextOptions<TurnfixContext> options)
        : base(options)
    {
    }

    public virtual DbSet<TfxBereiche> TfxBereiches { get; set; }

    public virtual DbSet<TfxDisgrpXDisziplinen> TfxDisgrpXDisziplinens { get; set; }

    public virtual DbSet<Discipline> TfxDisziplinens { get; set; }

    public virtual DbSet<TfxDisziplinenFelder> TfxDisziplinenFelders { get; set; }

    public virtual DbSet<TfxDisziplinenGruppen> TfxDisziplinenGruppens { get; set; }

    public virtual DbSet<TfxFormeln> TfxFormelns { get; set; }

    public virtual DbSet<TfxGaue> TfxGaues { get; set; }

    public virtual DbSet<TfxGruppen> TfxGruppens { get; set; }

    public virtual DbSet<TfxGruppenXTeilnehmer> TfxGruppenXTeilnehmers { get; set; }

    public virtual DbSet<TfxJuryResult> TfxJuryResults { get; set; }

    public virtual DbSet<TfxKonten> TfxKontens { get; set; }

    public virtual DbSet<TfxLaender> TfxLaenders { get; set; }

    public virtual DbSet<TfxLayout> TfxLayouts { get; set; }

    public virtual DbSet<TfxLayoutFelder> TfxLayoutFelders { get; set; }

    public virtual DbSet<TfxManXManAb> TfxManXManAbs { get; set; }

    public virtual DbSet<TfxManXTeilnehmer> TfxManXTeilnehmers { get; set; }

    public virtual DbSet<TfxMannschaften> TfxMannschaftens { get; set; }

    public virtual DbSet<TfxMannschaftenAbzug> TfxMannschaftenAbzugs { get; set; }

    public virtual DbSet<TfxPersonen> TfxPersonens { get; set; }

    public virtual DbSet<TfxQualiLeistungen> TfxQualiLeistungens { get; set; }

    public virtual DbSet<TfxRiegenXDisziplinen> TfxRiegenXDisziplinens { get; set; }

    public virtual DbSet<TfxSport> TfxSports { get; set; }

    public virtual DbSet<TfxStartreihenfolge> TfxStartreihenfolges { get; set; }

    public virtual DbSet<Status> TfxStatuses { get; set; }

    public virtual DbSet<Athlete> TfxTeilnehmers { get; set; }

    public virtual DbSet<Event> TfxVeranstaltungens { get; set; }

    public virtual DbSet<TfxVerbaende> TfxVerbaendes { get; set; }

    public virtual DbSet<TfxVereine> TfxVereines { get; set; }

    public virtual DbSet<TfxWertungen> TfxWertungens { get; set; }

    public virtual DbSet<TfxWertungenDetail> TfxWertungenDetails { get; set; }

    public virtual DbSet<TfxWertungenXDisziplinen> TfxWertungenXDisziplinens { get; set; }

    public virtual DbSet<TfxWettkaempfe> TfxWettkaempves { get; set; }

    public virtual DbSet<TfxWettkaempfeDispo> TfxWettkaempfeDispos { get; set; }

    public virtual DbSet<TfxWettkaempfeXDisziplinen> TfxWettkaempfeXDisziplinens { get; set; }

    public virtual DbSet<TfxWettkampforte> TfxWettkampfortes { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseNpgsql("Host=localhost;Database=turnfix;Username=postgres;Password=pgadmin");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TfxBereiche>(entity =>
        {
            entity.HasKey(e => e.IntBereicheid).HasName("pkx_bereicheid");

            entity.ToTable("tfx_bereiche");

            entity.Property(e => e.IntBereicheid).HasColumnName("int_bereicheid");
            entity.Property(e => e.BolMaennlich)
                .HasDefaultValue(true)
                .HasColumnName("bol_maennlich");
            entity.Property(e => e.BolWeiblich)
                .HasDefaultValue(true)
                .HasColumnName("bol_weiblich");
            entity.Property(e => e.VarName)
                .HasMaxLength(150)
                .HasColumnName("var_name");
        });

        modelBuilder.Entity<TfxDisgrpXDisziplinen>(entity =>
        {
            entity.HasKey(e => e.IntDisgrpXDisziplinenid).HasName("pky_disgrp_x_disziplinen");

            entity.ToTable("tfx_disgrp_x_disziplinen");

            entity.Property(e => e.IntDisgrpXDisziplinenid).HasColumnName("int_disgrp_x_disziplinenid");
            entity.Property(e => e.IntDisziplinenGruppenid).HasColumnName("int_disziplinen_gruppenid");
            entity.Property(e => e.IntDisziplinenid).HasColumnName("int_disziplinenid");
            entity.Property(e => e.IntPos).HasColumnName("int_pos");

            entity.HasOne(d => d.IntDisziplinenGruppen).WithMany(p => p.TfxDisgrpXDisziplinens)
                .HasForeignKey(d => d.IntDisziplinenGruppenid)
                .HasConstraintName("fky_disziplinen_gruppenid");

            entity.HasOne(d => d.IntDisziplinen).WithMany(p => p.TfxDisgrpXDisziplinens)
                .HasForeignKey(d => d.IntDisziplinenid)
                .HasConstraintName("fky_disziplinen");
        });

        modelBuilder.Entity<Discipline>(entity =>
        {
            entity.HasKey(e => e.IntDisziplinenid).HasName("pky_disziplinenid");

            entity.ToTable("tfx_disziplinen");

            entity.Property(e => e.IntDisziplinenid).HasColumnName("int_disziplinenid");
            entity.Property(e => e.BolBahnen)
                .HasDefaultValue(false)
                .HasColumnName("bol_bahnen");
            entity.Property(e => e.BolBerechnen)
                .HasDefaultValue(true)
                .HasColumnName("bol_berechnen");
            entity.Property(e => e.BolM)
                .HasDefaultValue(true)
                .HasColumnName("bol_m");
            entity.Property(e => e.BolW)
                .HasDefaultValue(true)
                .HasColumnName("bol_w");
            entity.Property(e => e.IntBerechnung)
                .HasDefaultValue((short)2)
                .HasColumnName("int_berechnung");
            entity.Property(e => e.IntFormelid).HasColumnName("int_formelid");
            entity.Property(e => e.IntSportid).HasColumnName("int_sportid");
            entity.Property(e => e.IntVersuche)
                .HasDefaultValue(1)
                .HasColumnName("int_versuche");
            entity.Property(e => e.VarEinheit)
                .HasMaxLength(5)
                .HasColumnName("var_einheit");
            entity.Property(e => e.VarFormel)
                .HasMaxLength(300)
                .HasColumnName("var_formel");
            entity.Property(e => e.VarIcon)
                .HasMaxLength(50)
                .HasColumnName("var_icon");
            entity.Property(e => e.VarKuerzel)
                .HasMaxLength(50)
                .HasColumnName("var_kuerzel");
            entity.Property(e => e.VarKurz1)
                .HasMaxLength(6)
                .HasColumnName("var_kurz1");
            entity.Property(e => e.VarKurz2)
                .HasMaxLength(20)
                .HasColumnName("var_kurz2");
            entity.Property(e => e.VarMaske)
                .HasMaxLength(10)
                .HasColumnName("var_maske");
            entity.Property(e => e.VarName)
                .HasMaxLength(100)
                .HasColumnName("var_name");

            entity.HasOne(d => d.IntFormel).WithMany(p => p.TfxDisziplinens)
                .HasForeignKey(d => d.IntFormelid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_formelid");

            entity.HasOne(d => d.IntSport).WithMany(p => p.TfxDisziplinens)
                .HasForeignKey(d => d.IntSportid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_sportid");
        });

        modelBuilder.Entity<TfxDisziplinenFelder>(entity =>
        {
            entity.HasKey(e => e.IntDisziplinenFelderid).HasName("pky_disziplinen_felderid");

            entity.ToTable("tfx_disziplinen_felder");

            entity.Property(e => e.IntDisziplinenFelderid).HasColumnName("int_disziplinen_felderid");
            entity.Property(e => e.BolAusgangswert)
                .HasDefaultValue(true)
                .HasColumnName("bol_ausgangswert");
            entity.Property(e => e.BolEnabled)
                .HasDefaultValue(true)
                .HasColumnName("bol_enabled");
            entity.Property(e => e.BolEndwert)
                .HasDefaultValue(true)
                .HasColumnName("bol_endwert");
            entity.Property(e => e.IntDisziplinenid).HasColumnName("int_disziplinenid");
            entity.Property(e => e.IntGruppe)
                .HasDefaultValue((short)1)
                .HasColumnName("int_gruppe");
            entity.Property(e => e.IntSortierung).HasColumnName("int_sortierung");
            entity.Property(e => e.VarName)
                .HasMaxLength(15)
                .HasColumnName("var_name");

            entity.HasOne(d => d.IntDisziplinen).WithMany(p => p.TfxDisziplinenFelders)
                .HasForeignKey(d => d.IntDisziplinenid)
                .HasConstraintName("fky_disziplinenid");
        });

        modelBuilder.Entity<TfxDisziplinenGruppen>(entity =>
        {
            entity.HasKey(e => e.IntDisziplinenGruppenid).HasName("pky_disziplinen_gruppenid");

            entity.ToTable("tfx_disziplinen_gruppen");

            entity.Property(e => e.IntDisziplinenGruppenid).HasColumnName("int_disziplinen_gruppenid");
            entity.Property(e => e.TxtComment).HasColumnName("txt_comment");
            entity.Property(e => e.VarName)
                .HasMaxLength(100)
                .HasColumnName("var_name");
        });

        modelBuilder.Entity<TfxFormeln>(entity =>
        {
            entity.HasKey(e => e.IntFormelid).HasName("pky_formeln");

            entity.ToTable("tfx_formeln");

            entity.Property(e => e.IntFormelid).HasColumnName("int_formelid");
            entity.Property(e => e.IntTyp)
                .HasDefaultValue((short)0)
                .HasColumnName("int_typ");
            entity.Property(e => e.VarFormel)
                .HasMaxLength(200)
                .HasColumnName("var_formel");
            entity.Property(e => e.VarName)
                .HasMaxLength(100)
                .HasColumnName("var_name");
        });

        modelBuilder.Entity<TfxGaue>(entity =>
        {
            entity.HasKey(e => e.IntGaueid).HasName("pky_gaueid");

            entity.ToTable("tfx_gaue");

            entity.Property(e => e.IntGaueid).HasColumnName("int_gaueid");
            entity.Property(e => e.IntVerbaendeid).HasColumnName("int_verbaendeid");
            entity.Property(e => e.VarKuerzel)
                .HasMaxLength(15)
                .HasColumnName("var_kuerzel");
            entity.Property(e => e.VarName)
                .HasMaxLength(150)
                .HasColumnName("var_name");

            entity.HasOne(d => d.IntVerbaende).WithMany(p => p.TfxGaues)
                .HasForeignKey(d => d.IntVerbaendeid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_verbaendeid");
        });

        modelBuilder.Entity<TfxGruppen>(entity =>
        {
            entity.HasKey(e => e.IntGruppenid).HasName("pky_gruppenid");

            entity.ToTable("tfx_gruppen");

            entity.Property(e => e.IntGruppenid).HasColumnName("int_gruppenid");
            entity.Property(e => e.IntVereineid).HasColumnName("int_vereineid");
            entity.Property(e => e.VarName)
                .HasMaxLength(150)
                .HasColumnName("var_name");
        });

        modelBuilder.Entity<TfxGruppenXTeilnehmer>(entity =>
        {
            entity.HasKey(e => e.IntGruppenXTeilnehmerid).HasName("pky_gruppen_x_teilnehmerid");

            entity.ToTable("tfx_gruppen_x_teilnehmer");

            entity.Property(e => e.IntGruppenXTeilnehmerid).HasColumnName("int_gruppen_x_teilnehmerid");
            entity.Property(e => e.IntGruppenid).HasColumnName("int_gruppenid");
            entity.Property(e => e.IntTeilnehmerid).HasColumnName("int_teilnehmerid");

            entity.HasOne(d => d.IntGruppen).WithMany(p => p.TfxGruppenXTeilnehmers)
                .HasForeignKey(d => d.IntGruppenid)
                .HasConstraintName("fky_gruppenid");

            entity.HasOne(d => d.IntTeilnehmer).WithMany(p => p.TfxGruppenXTeilnehmers)
                .HasForeignKey(d => d.IntTeilnehmerid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_teilnehmerid");
        });

        modelBuilder.Entity<TfxJuryResult>(entity =>
        {
            entity.HasKey(e => e.IntJuryresultsid).HasName("pky_juryresultsid");

            entity.ToTable("tfx_jury_results");

            entity.Property(e => e.IntJuryresultsid).HasColumnName("int_juryresultsid");
            entity.Property(e => e.IntDisziplinenFelderid).HasColumnName("int_disziplinen_felderid");
            entity.Property(e => e.IntKp)
                .HasDefaultValue((short)0)
                .HasColumnName("int_kp");
            entity.Property(e => e.IntVersuch).HasColumnName("int_versuch");
            entity.Property(e => e.IntWertungenid).HasColumnName("int_wertungenid");
            entity.Property(e => e.RelLeistung).HasColumnName("rel_leistung");

            entity.HasOne(d => d.IntDisziplinenFelder).WithMany(p => p.TfxJuryResults)
                .HasForeignKey(d => d.IntDisziplinenFelderid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_disziplinen_felderid");

            entity.HasOne(d => d.IntWertungen).WithMany(p => p.TfxJuryResults)
                .HasForeignKey(d => d.IntWertungenid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fky_wertungenid");
        });

        modelBuilder.Entity<TfxKonten>(entity =>
        {
            entity.HasKey(e => e.IntKontenid).HasName("pky_kontenid");

            entity.ToTable("tfx_konten");

            entity.Property(e => e.IntKontenid).HasColumnName("int_kontenid");
            entity.Property(e => e.VarBank)
                .HasMaxLength(150)
                .HasColumnName("var_bank");
            entity.Property(e => e.VarBlz)
                .HasMaxLength(8)
                .HasColumnName("var_blz");
            entity.Property(e => e.VarInhabe)
                .HasMaxLength(150)
                .HasColumnName("var_inhabe");
            entity.Property(e => e.VarKontonummer)
                .HasMaxLength(10)
                .HasColumnName("var_kontonummer");
            entity.Property(e => e.VarName)
                .HasMaxLength(150)
                .HasColumnName("var_name");
        });

        modelBuilder.Entity<TfxLaender>(entity =>
        {
            entity.HasKey(e => e.IntLaenderid).HasName("pky_laenderid");

            entity.ToTable("tfx_laender");

            entity.Property(e => e.IntLaenderid).HasColumnName("int_laenderid");
            entity.Property(e => e.VarKuerzel)
                .HasMaxLength(4)
                .HasColumnName("var_kuerzel");
            entity.Property(e => e.VarName)
                .HasMaxLength(150)
                .HasColumnName("var_name");
        });

        modelBuilder.Entity<TfxLayout>(entity =>
        {
            entity.HasKey(e => e.IntLayoutid).HasName("pky_layoutid");

            entity.ToTable("tfx_layouts");

            entity.Property(e => e.IntLayoutid).HasColumnName("int_layoutid");
            entity.Property(e => e.TxtComment).HasColumnName("txt_comment");
            entity.Property(e => e.VarName)
                .HasMaxLength(100)
                .HasColumnName("var_name");
        });

        modelBuilder.Entity<TfxLayoutFelder>(entity =>
        {
            entity.HasKey(e => e.IntLayoutFelderid).HasName("pky_layout_felderid");

            entity.ToTable("tfx_layout_felder");

            entity.Property(e => e.IntLayoutFelderid).HasColumnName("int_layout_felderid");
            entity.Property(e => e.IntAlign)
                .HasDefaultValue((short)0)
                .HasColumnName("int_align");
            entity.Property(e => e.IntLayer).HasColumnName("int_layer");
            entity.Property(e => e.IntLayoutid).HasColumnName("int_layoutid");
            entity.Property(e => e.IntTyp).HasColumnName("int_typ");
            entity.Property(e => e.RelH).HasColumnName("rel_h");
            entity.Property(e => e.RelW).HasColumnName("rel_w");
            entity.Property(e => e.RelX).HasColumnName("rel_x");
            entity.Property(e => e.RelY).HasColumnName("rel_y");
            entity.Property(e => e.VarFont)
                .HasMaxLength(150)
                .HasColumnName("var_font");
            entity.Property(e => e.VarValue)
                .HasMaxLength(200)
                .HasColumnName("var_value");

            entity.HasOne(d => d.IntLayout).WithMany(p => p.TfxLayoutFelders)
                .HasForeignKey(d => d.IntLayoutid)
                .HasConstraintName("fky_layoutid");
        });

        modelBuilder.Entity<TfxManXManAb>(entity =>
        {
            entity.HasKey(e => e.IntManXManAbid).HasName("pky_man_x_man_abid");

            entity.ToTable("tfx_man_x_man_ab");

            entity.Property(e => e.IntManXManAbid).HasColumnName("int_man_x_man_abid");
            entity.Property(e => e.IntMannschaftenAbzugid).HasColumnName("int_mannschaften_abzugid");
            entity.Property(e => e.IntMannschaftenid).HasColumnName("int_mannschaftenid");

            entity.HasOne(d => d.IntMannschaftenAbzug).WithMany(p => p.TfxManXManAbs)
                .HasForeignKey(d => d.IntMannschaftenAbzugid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_mannschaften_abzugid");

            entity.HasOne(d => d.IntMannschaften).WithMany(p => p.TfxManXManAbs)
                .HasForeignKey(d => d.IntMannschaftenid)
                .HasConstraintName("fky_mannschaftenid");
        });

        modelBuilder.Entity<TfxManXTeilnehmer>(entity =>
        {
            entity.HasKey(e => e.IntManXTeilnehmerid).HasName("pky_man_x_teilnehmerid");

            entity.ToTable("tfx_man_x_teilnehmer");

            entity.Property(e => e.IntManXTeilnehmerid).HasColumnName("int_man_x_teilnehmerid");
            entity.Property(e => e.IntMannschaftenid).HasColumnName("int_mannschaftenid");
            entity.Property(e => e.IntRunde).HasColumnName("int_runde");
            entity.Property(e => e.IntTeilnehmerid).HasColumnName("int_teilnehmerid");

            entity.HasOne(d => d.IntMannschaften).WithMany(p => p.TfxManXTeilnehmers)
                .HasForeignKey(d => d.IntMannschaftenid)
                .HasConstraintName("fky_mannschaftenid");

            entity.HasOne(d => d.IntTeilnehmer).WithMany(p => p.TfxManXTeilnehmers)
                .HasForeignKey(d => d.IntTeilnehmerid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_teilnehmerid");
        });

        modelBuilder.Entity<TfxMannschaften>(entity =>
        {
            entity.HasKey(e => e.IntMannschaftenid).HasName("pky_mannschaftenid");

            entity.ToTable("tfx_mannschaften");

            entity.Property(e => e.IntMannschaftenid).HasColumnName("int_mannschaftenid");
            entity.Property(e => e.IntNummer)
                .HasDefaultValue((short)1)
                .HasColumnName("int_nummer");
            entity.Property(e => e.IntStartnummer).HasColumnName("int_startnummer");
            entity.Property(e => e.IntVereineid).HasColumnName("int_vereineid");
            entity.Property(e => e.IntWettkaempfeid).HasColumnName("int_wettkaempfeid");
            entity.Property(e => e.VarRiege)
                .HasMaxLength(5)
                .HasDefaultValueSql("1")
                .HasColumnName("var_riege");

            entity.HasOne(d => d.IntVereine).WithMany(p => p.TfxMannschaftens)
                .HasForeignKey(d => d.IntVereineid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_vereineid");

            entity.HasOne(d => d.IntWettkaempfe).WithMany(p => p.TfxMannschaftens)
                .HasForeignKey(d => d.IntWettkaempfeid)
                .HasConstraintName("fky_wettkaempfeid");
        });

        modelBuilder.Entity<TfxMannschaftenAbzug>(entity =>
        {
            entity.HasKey(e => e.IntMannschaftenAbzugid).HasName("pky_mannschaften_abzugid");

            entity.ToTable("tfx_mannschaften_abzug");

            entity.Property(e => e.IntMannschaftenAbzugid).HasColumnName("int_mannschaften_abzugid");
            entity.Property(e => e.RelAbzug).HasColumnName("rel_abzug");
            entity.Property(e => e.VarName)
                .HasMaxLength(100)
                .HasColumnName("var_name");
        });

        modelBuilder.Entity<TfxPersonen>(entity =>
        {
            entity.HasKey(e => e.IntPersonenid).HasName("pky_personenid");

            entity.ToTable("tfx_personen");

            entity.Property(e => e.IntPersonenid).HasColumnName("int_personenid");
            entity.Property(e => e.VarAdresse)
                .HasMaxLength(200)
                .HasColumnName("var_adresse");
            entity.Property(e => e.VarEmail)
                .HasMaxLength(200)
                .HasColumnName("var_email");
            entity.Property(e => e.VarFax)
                .HasMaxLength(25)
                .HasColumnName("var_fax");
            entity.Property(e => e.VarNachname)
                .HasMaxLength(150)
                .HasColumnName("var_nachname");
            entity.Property(e => e.VarOrt)
                .HasMaxLength(150)
                .HasColumnName("var_ort");
            entity.Property(e => e.VarPlz)
                .HasMaxLength(5)
                .HasColumnName("var_plz");
            entity.Property(e => e.VarTelefon)
                .HasMaxLength(25)
                .HasColumnName("var_telefon");
            entity.Property(e => e.VarVorname)
                .HasMaxLength(150)
                .HasColumnName("var_vorname");
        });

        modelBuilder.Entity<TfxQualiLeistungen>(entity =>
        {
            entity.HasKey(e => e.IntQualiLeistungenid).HasName("pky_quali_leistungenid");

            entity.ToTable("tfx_quali_leistungen");

            entity.Property(e => e.IntQualiLeistungenid).HasColumnName("int_quali_leistungenid");
            entity.Property(e => e.IntDisziplinenid).HasColumnName("int_disziplinenid");
            entity.Property(e => e.IntWertungenid).HasColumnName("int_wertungenid");
            entity.Property(e => e.RelLeistung).HasColumnName("rel_leistung");

            entity.HasOne(d => d.IntDisziplinen).WithMany(p => p.TfxQualiLeistungens)
                .HasForeignKey(d => d.IntDisziplinenid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_disziplinenid");

            entity.HasOne(d => d.IntWertungen).WithMany(p => p.TfxQualiLeistungens)
                .HasForeignKey(d => d.IntWertungenid)
                .HasConstraintName("int_wertungenid");
        });

        modelBuilder.Entity<TfxRiegenXDisziplinen>(entity =>
        {
            entity.HasKey(e => e.IntRiegenXDisziplinenid).HasName("pky_riegen_x_disziplinenid");

            entity.ToTable("tfx_riegen_x_disziplinen");

            entity.Property(e => e.IntRiegenXDisziplinenid).HasColumnName("int_riegen_x_disziplinenid");
            entity.Property(e => e.BolErstesGeraet)
                .HasDefaultValue(false)
                .HasColumnName("bol_erstes_geraet");
            entity.Property(e => e.IntDisziplinenid).HasColumnName("int_disziplinenid");
            entity.Property(e => e.IntRunde).HasColumnName("int_runde");
            entity.Property(e => e.IntStatusid).HasColumnName("int_statusid");
            entity.Property(e => e.IntVeranstaltungenid).HasColumnName("int_veranstaltungenid");
            entity.Property(e => e.VarRiege)
                .HasMaxLength(5)
                .HasColumnName("var_riege");

            entity.HasOne(d => d.IntDisziplinen).WithMany(p => p.TfxRiegenXDisziplinens)
                .HasForeignKey(d => d.IntDisziplinenid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_disziplinenid");

            entity.HasOne(d => d.IntStatus).WithMany(p => p.TfxRiegenXDisziplinens)
                .HasForeignKey(d => d.IntStatusid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_statusid");

            entity.HasOne(d => d.IntVeranstaltungen).WithMany(p => p.TfxRiegenXDisziplinens)
                .HasForeignKey(d => d.IntVeranstaltungenid)
                .HasConstraintName("fky_veranstaltungenid");
        });

        modelBuilder.Entity<TfxSport>(entity =>
        {
            entity.HasKey(e => e.IntSportid).HasName("pky_sportid");

            entity.ToTable("tfx_sport");

            entity.Property(e => e.IntSportid).HasColumnName("int_sportid");
            entity.Property(e => e.VarName)
                .HasMaxLength(100)
                .HasColumnName("var_name");
        });

        modelBuilder.Entity<TfxStartreihenfolge>(entity =>
        {
            entity.HasKey(e => e.IntStartreihenfolgeid).HasName("pky_startreihenfolge");

            entity.ToTable("tfx_startreihenfolge");

            entity.Property(e => e.IntStartreihenfolgeid).HasColumnName("int_startreihenfolgeid");
            entity.Property(e => e.IntDisziplinenid).HasColumnName("int_disziplinenid");
            entity.Property(e => e.IntKp)
                .HasDefaultValue((short)0)
                .HasColumnName("int_kp");
            entity.Property(e => e.IntPos).HasColumnName("int_pos");
            entity.Property(e => e.IntWertungenid).HasColumnName("int_wertungenid");

            entity.HasOne(d => d.IntDisziplinen).WithMany(p => p.TfxStartreihenfolges)
                .HasForeignKey(d => d.IntDisziplinenid)
                .HasConstraintName("fky_disziplinen");

            entity.HasOne(d => d.IntWertungen).WithMany(p => p.TfxStartreihenfolges)
                .HasForeignKey(d => d.IntWertungenid)
                .HasConstraintName("fky_wertungenid");
        });

        modelBuilder.Entity<Status>(entity =>
        {
            entity.HasKey(e => e.IntStatusid).HasName("pky_statusid");

            entity.ToTable("tfx_status");

            entity.Property(e => e.IntStatusid).HasColumnName("int_statusid");
            entity.Property(e => e.AryColorcode)
                .HasMaxLength(25)
                .HasDefaultValueSql("'{0,0,0}'::character varying")
                .HasColumnName("ary_colorcode");
            entity.Property(e => e.BolBogen)
                .HasDefaultValue(true)
                .HasColumnName("bol_bogen");
            entity.Property(e => e.BolKarte)
                .HasDefaultValue(true)
                .HasColumnName("bol_karte");
            entity.Property(e => e.VarName)
                .HasMaxLength(150)
                .HasColumnName("var_name");
        });

        modelBuilder.Entity<Athlete>(entity =>
        {
            entity.HasKey(e => e.IntTeilnehmerid).HasName("pky_teilnehmerid");

            entity.ToTable("tfx_teilnehmer");

            entity.Property(e => e.IntTeilnehmerid).HasColumnName("int_teilnehmerid");
            entity.Property(e => e.BoolNurJahr)
                .HasDefaultValue(true)
                .HasColumnName("bool_nur_jahr");
            entity.Property(e => e.DatGeburtstag).HasColumnName("dat_geburtstag");
            entity.Property(e => e.IntGeschlecht).HasColumnName("int_geschlecht");
            entity.Property(e => e.IntStartpassnummer)
                .HasDefaultValue(0)
                .HasColumnName("int_startpassnummer");
            entity.Property(e => e.IntVereineid).HasColumnName("int_vereineid");
            entity.Property(e => e.VarNachname)
                .HasMaxLength(150)
                .HasColumnName("var_nachname");
            entity.Property(e => e.VarVorname)
                .HasMaxLength(150)
                .HasColumnName("var_vorname");

            entity.HasOne(d => d.IntVereine).WithMany(p => p.TfxTeilnehmers)
                .HasForeignKey(d => d.IntVereineid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_vereineid");
        });

        modelBuilder.Entity<Event>(entity =>
        {
            entity.HasKey(e => e.IntVeranstaltungenid).HasName("pky_veranstaltungenid");

            entity.ToTable("tfx_veranstaltungen");

            entity.Property(e => e.IntVeranstaltungenid).HasColumnName("int_veranstaltungenid");
            entity.Property(e => e.BolFaelligNichtantritt)
                .HasDefaultValue(false)
                .HasColumnName("bol_faellig_nichtantritt");
            entity.Property(e => e.BolNachmeldungMoeglich)
                .HasDefaultValue(false)
                .HasColumnName("bol_nachmeldung_moeglich");
            entity.Property(e => e.BolRundenwettkampf)
                .HasDefaultValue(false)
                .HasColumnName("bol_rundenwettkampf");
            entity.Property(e => e.BolUmmeldungMoeglich)
                .HasDefaultValue(false)
                .HasColumnName("bol_ummeldung_moeglich");
            entity.Property(e => e.DatBis).HasColumnName("dat_bis");
            entity.Property(e => e.DatMeldeschluss).HasColumnName("dat_meldeschluss");
            entity.Property(e => e.DatVon).HasColumnName("dat_von");
            entity.Property(e => e.IntAnsprechpartner).HasColumnName("int_ansprechpartner");
            entity.Property(e => e.IntEdv)
                .HasDefaultValue((short)0)
                .HasColumnName("int_edv");
            entity.Property(e => e.IntHauptwettkampf).HasColumnName("int_hauptwettkampf");
            entity.Property(e => e.IntHelfer)
                .HasDefaultValue((short)0)
                .HasColumnName("int_helfer");
            entity.Property(e => e.IntKampfrichter)
                .HasDefaultValue((short)0)
                .HasColumnName("int_kampfrichter");
            entity.Property(e => e.IntKontenid).HasColumnName("int_kontenid");
            entity.Property(e => e.IntMeldungAn).HasColumnName("int_meldung_an");
            entity.Property(e => e.IntRunde)
                .HasDefaultValue((short)1)
                .HasColumnName("int_runde");
            entity.Property(e => e.IntWettkampforteid).HasColumnName("int_wettkampforteid");
            entity.Property(e => e.RelMeldegeld)
                .HasDefaultValueSql("0")
                .HasColumnName("rel_meldegeld");
            entity.Property(e => e.RelNachmeldung)
                .HasDefaultValueSql("0")
                .HasColumnName("rel_nachmeldung");
            entity.Property(e => e.TxtHinweise).HasColumnName("txt_hinweise");
            entity.Property(e => e.TxtKampfrichter).HasColumnName("txt_kampfrichter");
            entity.Property(e => e.TxtMeldungAn).HasColumnName("txt_meldung_an");
            entity.Property(e => e.TxtSiegerauszeichnung).HasColumnName("txt_siegerauszeichnung");
            entity.Property(e => e.TxtStartberechtigung).HasColumnName("txt_startberechtigung");
            entity.Property(e => e.TxtTeilnahmebedingungen).HasColumnName("txt_teilnahmebedingungen");
            entity.Property(e => e.VarMeldungWebsite)
                .HasMaxLength(200)
                .HasColumnName("var_meldung_website");
            entity.Property(e => e.VarName)
                .HasMaxLength(250)
                .HasColumnName("var_name");
            entity.Property(e => e.VarVeranstalter)
                .HasMaxLength(150)
                .HasColumnName("var_veranstalter");
            entity.Property(e => e.VarVerwendungszweck)
                .HasMaxLength(150)
                .HasColumnName("var_verwendungszweck");

            entity.HasOne(d => d.IntAnsprechpartnerNavigation).WithMany(p => p.TfxVeranstaltungenIntAnsprechpartnerNavigations)
                .HasForeignKey(d => d.IntAnsprechpartner)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_ansprechpartner");

            entity.HasOne(d => d.IntHauptwettkampfNavigation).WithMany(p => p.InverseIntHauptwettkampfNavigation)
                .HasForeignKey(d => d.IntHauptwettkampf)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_hauptwettkampf");

            entity.HasOne(d => d.IntKonten).WithMany(p => p.TfxVeranstaltungens)
                .HasForeignKey(d => d.IntKontenid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_kontenid");

            entity.HasOne(d => d.IntMeldungAnNavigation).WithMany(p => p.TfxVeranstaltungenIntMeldungAnNavigations)
                .HasForeignKey(d => d.IntMeldungAn)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_meldung_an");

            entity.HasOne(d => d.IntWettkampforte).WithMany(p => p.TfxVeranstaltungens)
                .HasForeignKey(d => d.IntWettkampforteid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_wettkampforteid");
        });

        modelBuilder.Entity<TfxVerbaende>(entity =>
        {
            entity.HasKey(e => e.IntVerbaendeid).HasName("pky_verbaendeid");

            entity.ToTable("tfx_verbaende");

            entity.Property(e => e.IntVerbaendeid).HasColumnName("int_verbaendeid");
            entity.Property(e => e.IntLaenderid).HasColumnName("int_laenderid");
            entity.Property(e => e.VarKuerzel)
                .HasMaxLength(8)
                .HasColumnName("var_kuerzel");
            entity.Property(e => e.VarName)
                .HasMaxLength(150)
                .HasColumnName("var_name");

            entity.HasOne(d => d.IntLaender).WithMany(p => p.TfxVerbaendes)
                .HasForeignKey(d => d.IntLaenderid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fkx_laenderid");
        });

        modelBuilder.Entity<TfxVereine>(entity =>
        {
            entity.HasKey(e => e.IntVereineid).HasName("pky_vereineid");

            entity.ToTable("tfx_vereine");

            entity.Property(e => e.IntVereineid).HasColumnName("int_vereineid");
            entity.Property(e => e.IntGaueid)
                .HasDefaultValue(1)
                .HasColumnName("int_gaueid");
            entity.Property(e => e.IntPersonenid).HasColumnName("int_personenid");
            entity.Property(e => e.IntStartOrt)
                .HasDefaultValue((short)0)
                .HasColumnName("int_start_ort");
            entity.Property(e => e.VarName)
                .HasMaxLength(150)
                .HasColumnName("var_name");
            entity.Property(e => e.VarWebsite)
                .HasMaxLength(200)
                .HasColumnName("var_website");

            entity.HasOne(d => d.IntGaue).WithMany(p => p.TfxVereines)
                .HasForeignKey(d => d.IntGaueid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_gaueid");

            entity.HasOne(d => d.IntPersonen).WithMany(p => p.TfxVereines)
                .HasForeignKey(d => d.IntPersonenid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_personenid");
        });

        modelBuilder.Entity<TfxWertungen>(entity =>
        {
            entity.HasKey(e => e.IntWertungenid).HasName("pky_wertungenid");

            entity.ToTable("tfx_wertungen");

            entity.Property(e => e.IntWertungenid).HasColumnName("int_wertungenid");
            entity.Property(e => e.BolAk)
                .HasDefaultValue(false)
                .HasColumnName("bol_ak");
            entity.Property(e => e.BolStartetNicht)
                .HasDefaultValue(false)
                .HasColumnName("bol_startet_nicht");
            entity.Property(e => e.IntGruppenid).HasColumnName("int_gruppenid");
            entity.Property(e => e.IntMannschaftenid).HasColumnName("int_mannschaftenid");
            entity.Property(e => e.IntRunde)
                .HasDefaultValue((short)1)
                .HasColumnName("int_runde");
            entity.Property(e => e.IntStartnummer).HasColumnName("int_startnummer");
            entity.Property(e => e.IntStatusid).HasColumnName("int_statusid");
            entity.Property(e => e.IntTeilnehmerid).HasColumnName("int_teilnehmerid");
            entity.Property(e => e.IntWettkaempfeid).HasColumnName("int_wettkaempfeid");
            entity.Property(e => e.VarComment)
                .HasMaxLength(150)
                .HasColumnName("var_comment");
            entity.Property(e => e.VarRiege)
                .HasMaxLength(10)
                .HasColumnName("var_riege");

            entity.HasOne(d => d.IntGruppen).WithMany(p => p.TfxWertungens)
                .HasForeignKey(d => d.IntGruppenid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fky_gruppenid");

            entity.HasOne(d => d.IntMannschaften).WithMany(p => p.TfxWertungens)
                .HasForeignKey(d => d.IntMannschaftenid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fky_mannschaftenid");

            entity.HasOne(d => d.IntStatus).WithMany(p => p.TfxWertungens)
                .HasForeignKey(d => d.IntStatusid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_statusid");

            entity.HasOne(d => d.IntTeilnehmer).WithMany(p => p.TfxWertungens)
                .HasForeignKey(d => d.IntTeilnehmerid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_teilnehmerid");

            entity.HasOne(d => d.IntWettkaempfe).WithMany(p => p.TfxWertungens)
                .HasForeignKey(d => d.IntWettkaempfeid)
                .HasConstraintName("fky_wettkaempfeid");
        });

        modelBuilder.Entity<TfxWertungenDetail>(entity =>
        {
            entity.HasKey(e => e.IntWertungenDetailsid).HasName("pky_wertungen_detailsid");

            entity.ToTable("tfx_wertungen_details");

            entity.Property(e => e.IntWertungenDetailsid).HasColumnName("int_wertungen_detailsid");
            entity.Property(e => e.IntDisziplinenid).HasColumnName("int_disziplinenid");
            entity.Property(e => e.IntKp)
                .HasDefaultValue((short)0)
                .HasColumnName("int_kp");
            entity.Property(e => e.IntVersuch).HasColumnName("int_versuch");
            entity.Property(e => e.IntWertungenid).HasColumnName("int_wertungenid");
            entity.Property(e => e.RelLeistung).HasColumnName("rel_leistung");

            entity.HasOne(d => d.IntDisziplinen).WithMany(p => p.TfxWertungenDetails)
                .HasForeignKey(d => d.IntDisziplinenid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_disziplinenid");

            entity.HasOne(d => d.IntWertungen).WithMany(p => p.TfxWertungenDetails)
                .HasForeignKey(d => d.IntWertungenid)
                .HasConstraintName("fky_wertungenid");
        });

        modelBuilder.Entity<TfxWertungenXDisziplinen>(entity =>
        {
            entity.HasKey(e => e.IntWertungenXDisziplinenid).HasName("pky_wertungen_x_disziplinenid");

            entity.ToTable("tfx_wertungen_x_disziplinen");

            entity.Property(e => e.IntWertungenXDisziplinenid).HasColumnName("int_wertungen_x_disziplinenid");
            entity.Property(e => e.IntDisziplinenid).HasColumnName("int_disziplinenid");
            entity.Property(e => e.IntWertungenid).HasColumnName("int_wertungenid");

            entity.HasOne(d => d.IntDisziplinen).WithMany(p => p.TfxWertungenXDisziplinens)
                .HasForeignKey(d => d.IntDisziplinenid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_disziplinenid");

            entity.HasOne(d => d.IntWertungen).WithMany(p => p.TfxWertungenXDisziplinens)
                .HasForeignKey(d => d.IntWertungenid)
                .HasConstraintName("fky_wertungenid");
        });

        modelBuilder.Entity<TfxWettkaempfe>(entity =>
        {
            entity.HasKey(e => e.IntWettkaempfeid).HasName("pky_wettkaempfeid");

            entity.ToTable("tfx_wettkaempfe");

            entity.Property(e => e.IntWettkaempfeid).HasColumnName("int_wettkaempfeid");
            entity.Property(e => e.BolAkAnzeigen)
                .HasDefaultValue(false)
                .HasColumnName("bol_ak_anzeigen");
            entity.Property(e => e.BolGerpkt)
                .HasDefaultValue(false)
                .HasColumnName("bol_gerpkt");
            entity.Property(e => e.BolInfoAnzeigen)
                .HasDefaultValue(false)
                .HasColumnName("bol_info_anzeigen");
            entity.Property(e => e.BolKp)
                .HasDefaultValue(false)
                .HasColumnName("bol_kp");
            entity.Property(e => e.BolMansort)
                .HasDefaultValue(false)
                .HasColumnName("bol_mansort");
            entity.Property(e => e.BolSortasc)
                .HasDefaultValue(false)
                .HasColumnName("bol_sortasc");
            entity.Property(e => e.BolStreichwertung)
                .HasDefaultValue(false)
                .HasColumnName("bol_streichwertung");
            entity.Property(e => e.BolWahlwettkampf)
                .HasDefaultValue(false)
                .HasColumnName("bol_wahlwettkampf");
            entity.Property(e => e.IntAnzStreich)
                .HasDefaultValue((short)0)
                .HasColumnName("int_anz_streich");
            entity.Property(e => e.IntBahn)
                .HasDefaultValue((short)1)
                .HasColumnName("int_bahn");
            entity.Property(e => e.IntBereicheid).HasColumnName("int_bereicheid");
            entity.Property(e => e.IntDurchgang)
                .HasDefaultValue((short)1)
                .HasColumnName("int_durchgang");
            entity.Property(e => e.IntQualifikation)
                .HasDefaultValue((short)0)
                .HasColumnName("int_qualifikation");
            entity.Property(e => e.IntTyp)
                .HasDefaultValue((short)0)
                .HasColumnName("int_typ");
            entity.Property(e => e.IntVeranstaltungenid).HasColumnName("int_veranstaltungenid");
            entity.Property(e => e.IntWertungen).HasColumnName("int_wertungen");
            entity.Property(e => e.TimEinturnen).HasColumnName("tim_einturnen");
            entity.Property(e => e.TimStartzeit).HasColumnName("tim_startzeit");
            entity.Property(e => e.VarName)
                .HasMaxLength(150)
                .HasColumnName("var_name");
            entity.Property(e => e.VarNummer)
                .HasMaxLength(5)
                .HasColumnName("var_nummer");
            entity.Property(e => e.YerBis).HasColumnName("yer_bis");
            entity.Property(e => e.YerVon).HasColumnName("yer_von");

            entity.HasOne(d => d.IntBereiche).WithMany(p => p.TfxWettkaempves)
                .HasForeignKey(d => d.IntBereicheid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_bereicheid");

            entity.HasOne(d => d.IntVeranstaltungen).WithMany(p => p.TfxWettkaempves)
                .HasForeignKey(d => d.IntVeranstaltungenid)
                .HasConstraintName("fky_veranstaltungenid");
        });

        modelBuilder.Entity<TfxWettkaempfeDispo>(entity =>
        {
            entity.HasKey(e => e.IntWettkaempfeDisposid).HasName("pky_wettkaempfe_disposid");

            entity.ToTable("tfx_wettkaempfe_dispos");

            entity.Property(e => e.IntWettkaempfeDisposid).HasColumnName("int_wettkaempfe_disposid");
            entity.Property(e => e.IntKp)
                .HasDefaultValue((short)0)
                .HasColumnName("int_kp");
            entity.Property(e => e.IntSortx)
                .HasDefaultValue((short)0)
                .HasColumnName("int_sortx");
            entity.Property(e => e.IntSorty)
                .HasDefaultValue((short)0)
                .HasColumnName("int_sorty");
            entity.Property(e => e.IntWettkaempfeXDisziplinenid).HasColumnName("int_wettkaempfe_x_disziplinenid");

            entity.HasOne(d => d.IntWettkaempfeXDisziplinen).WithMany(p => p.TfxWettkaempfeDispos)
                .HasForeignKey(d => d.IntWettkaempfeXDisziplinenid)
                .HasConstraintName("fky_wettkaempfe_x_disziplinenid");
        });

        modelBuilder.Entity<TfxWettkaempfeXDisziplinen>(entity =>
        {
            entity.HasKey(e => e.IntWettkaempfeXDisziplinenid).HasName("pky_wettkaempfe_x_disziplinenid");

            entity.ToTable("tfx_wettkaempfe_x_disziplinen");

            entity.Property(e => e.IntWettkaempfeXDisziplinenid)
                .HasDefaultValueSql("nextval('tfx_wettkaempfe_x_disziplinen_int_wettkaempfe_x_disziplinen_seq'::regclass)")
                .HasColumnName("int_wettkaempfe_x_disziplinenid");
            entity.Property(e => e.BolKp)
                .HasDefaultValue(false)
                .HasColumnName("bol_kp");
            entity.Property(e => e.IntDisziplinenid).HasColumnName("int_disziplinenid");
            entity.Property(e => e.IntSortierung).HasColumnName("int_sortierung");
            entity.Property(e => e.IntWettkaempfeid).HasColumnName("int_wettkaempfeid");
            entity.Property(e => e.RelMax)
                .HasDefaultValueSql("0")
                .HasColumnName("rel_max");
            entity.Property(e => e.VarAusschreibung)
                .HasMaxLength(100)
                .HasColumnName("var_ausschreibung");

            entity.HasOne(d => d.IntDisziplinen).WithMany(p => p.TfxWettkaempfeXDisziplinens)
                .HasForeignKey(d => d.IntDisziplinenid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("fky_disziplinenid");

            entity.HasOne(d => d.IntWettkaempfe).WithMany(p => p.TfxWettkaempfeXDisziplinens)
                .HasForeignKey(d => d.IntWettkaempfeid)
                .HasConstraintName("fky_wettkaempfeid");
        });

        modelBuilder.Entity<TfxWettkampforte>(entity =>
        {
            entity.HasKey(e => e.IntWettkampforteid).HasName("pky_wettkampforteid");

            entity.ToTable("tfx_wettkampforte");

            entity.Property(e => e.IntWettkampforteid).HasColumnName("int_wettkampforteid");
            entity.Property(e => e.VarAdresse)
                .HasMaxLength(200)
                .HasColumnName("var_adresse");
            entity.Property(e => e.VarName)
                .HasMaxLength(150)
                .HasColumnName("var_name");
            entity.Property(e => e.VarOrt)
                .HasMaxLength(150)
                .HasColumnName("var_ort");
            entity.Property(e => e.VarPlz)
                .HasMaxLength(5)
                .HasColumnName("var_plz");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
