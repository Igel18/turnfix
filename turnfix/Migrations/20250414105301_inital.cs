using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace turnfix.Migrations
{
    /// <inheritdoc />
    public partial class inital : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tfx_bereiche",
                columns: table => new
                {
                    int_bereicheid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    var_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    bol_maennlich = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true),
                    bol_weiblich = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pkx_bereicheid", x => x.int_bereicheid);
                });

            migrationBuilder.CreateTable(
                name: "tfx_disziplinen_gruppen",
                columns: table => new
                {
                    int_disziplinen_gruppenid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    var_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    txt_comment = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_disziplinen_gruppenid", x => x.int_disziplinen_gruppenid);
                });

            migrationBuilder.CreateTable(
                name: "tfx_formeln",
                columns: table => new
                {
                    int_formelid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    var_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    var_formel = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    int_typ = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_formeln", x => x.int_formelid);
                });

            migrationBuilder.CreateTable(
                name: "tfx_gruppen",
                columns: table => new
                {
                    int_gruppenid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_vereineid = table.Column<int>(type: "integer", nullable: false),
                    var_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_gruppenid", x => x.int_gruppenid);
                });

            migrationBuilder.CreateTable(
                name: "tfx_konten",
                columns: table => new
                {
                    int_kontenid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    var_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    var_kontonummer = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    var_blz = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true),
                    var_bank = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    var_inhabe = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_kontenid", x => x.int_kontenid);
                });

            migrationBuilder.CreateTable(
                name: "tfx_laender",
                columns: table => new
                {
                    int_laenderid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    var_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    var_kuerzel = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_laenderid", x => x.int_laenderid);
                });

            migrationBuilder.CreateTable(
                name: "tfx_layouts",
                columns: table => new
                {
                    int_layoutid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    var_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    txt_comment = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_layoutid", x => x.int_layoutid);
                });

            migrationBuilder.CreateTable(
                name: "tfx_mannschaften_abzug",
                columns: table => new
                {
                    int_mannschaften_abzugid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    var_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    rel_abzug = table.Column<float>(type: "real", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_mannschaften_abzugid", x => x.int_mannschaften_abzugid);
                });

            migrationBuilder.CreateTable(
                name: "tfx_personen",
                columns: table => new
                {
                    int_personenid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    var_vorname = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    var_nachname = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    var_adresse = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    var_plz = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true),
                    var_ort = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    var_telefon = table.Column<string>(type: "character varying(25)", maxLength: 25, nullable: true),
                    var_fax = table.Column<string>(type: "character varying(25)", maxLength: 25, nullable: true),
                    var_email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_personenid", x => x.int_personenid);
                });

            migrationBuilder.CreateTable(
                name: "tfx_sport",
                columns: table => new
                {
                    int_sportid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    var_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_sportid", x => x.int_sportid);
                });

            migrationBuilder.CreateTable(
                name: "tfx_status",
                columns: table => new
                {
                    int_statusid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    var_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    ary_colorcode = table.Column<string>(type: "character varying(25)", maxLength: 25, nullable: true, defaultValueSql: "'{0,0,0}'::character varying"),
                    bol_bogen = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true),
                    bol_karte = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_statusid", x => x.int_statusid);
                });

            migrationBuilder.CreateTable(
                name: "tfx_wettkampforte",
                columns: table => new
                {
                    int_wettkampforteid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    var_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    var_adresse = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    var_plz = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true),
                    var_ort = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_wettkampforteid", x => x.int_wettkampforteid);
                });

            migrationBuilder.CreateTable(
                name: "tfx_verbaende",
                columns: table => new
                {
                    int_verbaendeid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_laenderid = table.Column<int>(type: "integer", nullable: false),
                    var_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    var_kuerzel = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_verbaendeid", x => x.int_verbaendeid);
                    table.ForeignKey(
                        name: "fkx_laenderid",
                        column: x => x.int_laenderid,
                        principalTable: "tfx_laender",
                        principalColumn: "int_laenderid",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tfx_layout_felder",
                columns: table => new
                {
                    int_layout_felderid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_layoutid = table.Column<int>(type: "integer", nullable: false),
                    int_typ = table.Column<short>(type: "smallint", nullable: true),
                    var_font = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    rel_x = table.Column<float>(type: "real", nullable: true),
                    rel_y = table.Column<float>(type: "real", nullable: true),
                    rel_w = table.Column<float>(type: "real", nullable: true),
                    rel_h = table.Column<float>(type: "real", nullable: true),
                    var_value = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    int_align = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)0),
                    int_layer = table.Column<short>(type: "smallint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_layout_felderid", x => x.int_layout_felderid);
                    table.ForeignKey(
                        name: "fky_layoutid",
                        column: x => x.int_layoutid,
                        principalTable: "tfx_layouts",
                        principalColumn: "int_layoutid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tfx_disziplinen",
                columns: table => new
                {
                    int_disziplinenid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_sportid = table.Column<int>(type: "integer", nullable: false),
                    var_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    var_kurz1 = table.Column<string>(type: "character varying(6)", maxLength: 6, nullable: true),
                    var_kurz2 = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    var_formel = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    var_maske = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    int_versuche = table.Column<int>(type: "integer", nullable: true, defaultValue: 1),
                    var_icon = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    var_kuerzel = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    int_berechnung = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)2),
                    var_einheit = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true),
                    bol_bahnen = table.Column<bool>(type: "boolean", nullable: true, defaultValue: false),
                    bol_m = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true),
                    bol_w = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true),
                    int_formelid = table.Column<int>(type: "integer", nullable: true),
                    bol_berechnen = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_disziplinenid", x => x.int_disziplinenid);
                    table.ForeignKey(
                        name: "fky_formelid",
                        column: x => x.int_formelid,
                        principalTable: "tfx_formeln",
                        principalColumn: "int_formelid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fky_sportid",
                        column: x => x.int_sportid,
                        principalTable: "tfx_sport",
                        principalColumn: "int_sportid",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tfx_veranstaltungen",
                columns: table => new
                {
                    int_veranstaltungenid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_wettkampforteid = table.Column<int>(type: "integer", nullable: false),
                    int_meldung_an = table.Column<int>(type: "integer", nullable: true),
                    int_ansprechpartner = table.Column<int>(type: "integer", nullable: true),
                    int_kontenid = table.Column<int>(type: "integer", nullable: true),
                    int_hauptwettkampf = table.Column<int>(type: "integer", nullable: true),
                    var_name = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    int_runde = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)1),
                    dat_von = table.Column<DateOnly>(type: "date", nullable: false),
                    dat_bis = table.Column<DateOnly>(type: "date", nullable: false),
                    dat_meldeschluss = table.Column<DateOnly>(type: "date", nullable: true),
                    bol_rundenwettkampf = table.Column<bool>(type: "boolean", nullable: true, defaultValue: false),
                    var_veranstalter = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    int_edv = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)0),
                    int_helfer = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)0),
                    int_kampfrichter = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)0),
                    var_meldung_website = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    var_verwendungszweck = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    rel_meldegeld = table.Column<float>(type: "real", nullable: true, defaultValueSql: "0"),
                    rel_nachmeldung = table.Column<float>(type: "real", nullable: true, defaultValueSql: "0"),
                    bol_faellig_nichtantritt = table.Column<bool>(type: "boolean", nullable: true, defaultValue: false),
                    bol_ummeldung_moeglich = table.Column<bool>(type: "boolean", nullable: true, defaultValue: false),
                    bol_nachmeldung_moeglich = table.Column<bool>(type: "boolean", nullable: true, defaultValue: false),
                    txt_meldung_an = table.Column<string>(type: "text", nullable: true),
                    txt_startberechtigung = table.Column<string>(type: "text", nullable: true),
                    txt_teilnahmebedingungen = table.Column<string>(type: "text", nullable: true),
                    txt_siegerauszeichnung = table.Column<string>(type: "text", nullable: true),
                    txt_kampfrichter = table.Column<string>(type: "text", nullable: true),
                    txt_hinweise = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_veranstaltungenid", x => x.int_veranstaltungenid);
                    table.ForeignKey(
                        name: "fky_ansprechpartner",
                        column: x => x.int_ansprechpartner,
                        principalTable: "tfx_personen",
                        principalColumn: "int_personenid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fky_hauptwettkampf",
                        column: x => x.int_hauptwettkampf,
                        principalTable: "tfx_veranstaltungen",
                        principalColumn: "int_veranstaltungenid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fky_kontenid",
                        column: x => x.int_kontenid,
                        principalTable: "tfx_konten",
                        principalColumn: "int_kontenid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fky_meldung_an",
                        column: x => x.int_meldung_an,
                        principalTable: "tfx_personen",
                        principalColumn: "int_personenid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fky_wettkampforteid",
                        column: x => x.int_wettkampforteid,
                        principalTable: "tfx_wettkampforte",
                        principalColumn: "int_wettkampforteid",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tfx_gaue",
                columns: table => new
                {
                    int_gaueid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_verbaendeid = table.Column<int>(type: "integer", nullable: false),
                    var_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    var_kuerzel = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_gaueid", x => x.int_gaueid);
                    table.ForeignKey(
                        name: "fky_verbaendeid",
                        column: x => x.int_verbaendeid,
                        principalTable: "tfx_verbaende",
                        principalColumn: "int_verbaendeid",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tfx_disgrp_x_disziplinen",
                columns: table => new
                {
                    int_disgrp_x_disziplinenid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_disziplinen_gruppenid = table.Column<int>(type: "integer", nullable: false),
                    int_disziplinenid = table.Column<int>(type: "integer", nullable: false),
                    int_pos = table.Column<short>(type: "smallint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_disgrp_x_disziplinen", x => x.int_disgrp_x_disziplinenid);
                    table.ForeignKey(
                        name: "fky_disziplinen",
                        column: x => x.int_disziplinenid,
                        principalTable: "tfx_disziplinen",
                        principalColumn: "int_disziplinenid",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fky_disziplinen_gruppenid",
                        column: x => x.int_disziplinen_gruppenid,
                        principalTable: "tfx_disziplinen_gruppen",
                        principalColumn: "int_disziplinen_gruppenid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tfx_disziplinen_felder",
                columns: table => new
                {
                    int_disziplinen_felderid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_disziplinenid = table.Column<int>(type: "integer", nullable: false),
                    var_name = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: true),
                    int_sortierung = table.Column<short>(type: "smallint", nullable: true),
                    bol_endwert = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true),
                    bol_ausgangswert = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true),
                    int_gruppe = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)1),
                    bol_enabled = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_disziplinen_felderid", x => x.int_disziplinen_felderid);
                    table.ForeignKey(
                        name: "fky_disziplinenid",
                        column: x => x.int_disziplinenid,
                        principalTable: "tfx_disziplinen",
                        principalColumn: "int_disziplinenid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tfx_riegen_x_disziplinen",
                columns: table => new
                {
                    int_riegen_x_disziplinenid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_veranstaltungenid = table.Column<int>(type: "integer", nullable: false),
                    int_disziplinenid = table.Column<int>(type: "integer", nullable: false),
                    int_statusid = table.Column<int>(type: "integer", nullable: false),
                    var_riege = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true),
                    int_runde = table.Column<short>(type: "smallint", nullable: true),
                    bol_erstes_geraet = table.Column<bool>(type: "boolean", nullable: true, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_riegen_x_disziplinenid", x => x.int_riegen_x_disziplinenid);
                    table.ForeignKey(
                        name: "fky_disziplinenid",
                        column: x => x.int_disziplinenid,
                        principalTable: "tfx_disziplinen",
                        principalColumn: "int_disziplinenid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fky_statusid",
                        column: x => x.int_statusid,
                        principalTable: "tfx_status",
                        principalColumn: "int_statusid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fky_veranstaltungenid",
                        column: x => x.int_veranstaltungenid,
                        principalTable: "tfx_veranstaltungen",
                        principalColumn: "int_veranstaltungenid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tfx_wettkaempfe",
                columns: table => new
                {
                    int_wettkaempfeid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_veranstaltungenid = table.Column<int>(type: "integer", nullable: false),
                    int_bereicheid = table.Column<int>(type: "integer", nullable: false),
                    int_typ = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)0),
                    var_nummer = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true),
                    var_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    yer_von = table.Column<short>(type: "smallint", nullable: false),
                    yer_bis = table.Column<short>(type: "smallint", nullable: true),
                    int_qualifikation = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)0),
                    int_wertungen = table.Column<short>(type: "smallint", nullable: true),
                    bol_streichwertung = table.Column<bool>(type: "boolean", nullable: true, defaultValue: false),
                    bol_ak_anzeigen = table.Column<bool>(type: "boolean", nullable: true, defaultValue: false),
                    bol_wahlwettkampf = table.Column<bool>(type: "boolean", nullable: true, defaultValue: false),
                    int_durchgang = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)1),
                    int_bahn = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)1),
                    tim_startzeit = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    tim_einturnen = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    bol_info_anzeigen = table.Column<bool>(type: "boolean", nullable: true, defaultValue: false),
                    bol_kp = table.Column<bool>(type: "boolean", nullable: true, defaultValue: false),
                    bol_sortasc = table.Column<bool>(type: "boolean", nullable: true, defaultValue: false),
                    bol_mansort = table.Column<bool>(type: "boolean", nullable: true, defaultValue: false),
                    bol_gerpkt = table.Column<bool>(type: "boolean", nullable: true, defaultValue: false),
                    int_anz_streich = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_wettkaempfeid", x => x.int_wettkaempfeid);
                    table.ForeignKey(
                        name: "fky_bereicheid",
                        column: x => x.int_bereicheid,
                        principalTable: "tfx_bereiche",
                        principalColumn: "int_bereicheid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fky_veranstaltungenid",
                        column: x => x.int_veranstaltungenid,
                        principalTable: "tfx_veranstaltungen",
                        principalColumn: "int_veranstaltungenid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tfx_vereine",
                columns: table => new
                {
                    int_vereineid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_personenid = table.Column<int>(type: "integer", nullable: true),
                    var_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    int_start_ort = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)0),
                    var_website = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    int_gaueid = table.Column<int>(type: "integer", nullable: false, defaultValue: 1)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_vereineid", x => x.int_vereineid);
                    table.ForeignKey(
                        name: "fky_gaueid",
                        column: x => x.int_gaueid,
                        principalTable: "tfx_gaue",
                        principalColumn: "int_gaueid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fky_personenid",
                        column: x => x.int_personenid,
                        principalTable: "tfx_personen",
                        principalColumn: "int_personenid",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tfx_wettkaempfe_x_disziplinen",
                columns: table => new
                {
                    int_wettkaempfe_x_disziplinenid = table.Column<int>(type: "integer", nullable: false, defaultValueSql: "nextval('tfx_wettkaempfe_x_disziplinen_int_wettkaempfe_x_disziplinen_seq'::regclass)"),
                    int_wettkaempfeid = table.Column<int>(type: "integer", nullable: false),
                    int_disziplinenid = table.Column<int>(type: "integer", nullable: false),
                    var_ausschreibung = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    int_sortierung = table.Column<short>(type: "smallint", nullable: true),
                    bol_kp = table.Column<bool>(type: "boolean", nullable: true, defaultValue: false),
                    rel_max = table.Column<float>(type: "real", nullable: true, defaultValueSql: "0")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_wettkaempfe_x_disziplinenid", x => x.int_wettkaempfe_x_disziplinenid);
                    table.ForeignKey(
                        name: "fky_disziplinenid",
                        column: x => x.int_disziplinenid,
                        principalTable: "tfx_disziplinen",
                        principalColumn: "int_disziplinenid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fky_wettkaempfeid",
                        column: x => x.int_wettkaempfeid,
                        principalTable: "tfx_wettkaempfe",
                        principalColumn: "int_wettkaempfeid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tfx_mannschaften",
                columns: table => new
                {
                    int_mannschaftenid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_wettkaempfeid = table.Column<int>(type: "integer", nullable: false),
                    int_vereineid = table.Column<int>(type: "integer", nullable: false),
                    int_nummer = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)1),
                    var_riege = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true, defaultValueSql: "1"),
                    int_startnummer = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_mannschaftenid", x => x.int_mannschaftenid);
                    table.ForeignKey(
                        name: "fky_vereineid",
                        column: x => x.int_vereineid,
                        principalTable: "tfx_vereine",
                        principalColumn: "int_vereineid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fky_wettkaempfeid",
                        column: x => x.int_wettkaempfeid,
                        principalTable: "tfx_wettkaempfe",
                        principalColumn: "int_wettkaempfeid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tfx_teilnehmer",
                columns: table => new
                {
                    int_teilnehmerid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_vereineid = table.Column<int>(type: "integer", nullable: false),
                    var_vorname = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    var_nachname = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    int_geschlecht = table.Column<short>(type: "smallint", nullable: false),
                    dat_geburtstag = table.Column<DateOnly>(type: "date", nullable: true),
                    bool_nur_jahr = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true),
                    int_startpassnummer = table.Column<int>(type: "integer", nullable: true, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_teilnehmerid", x => x.int_teilnehmerid);
                    table.ForeignKey(
                        name: "fky_vereineid",
                        column: x => x.int_vereineid,
                        principalTable: "tfx_vereine",
                        principalColumn: "int_vereineid",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tfx_wettkaempfe_dispos",
                columns: table => new
                {
                    int_wettkaempfe_disposid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_wettkaempfe_x_disziplinenid = table.Column<int>(type: "integer", nullable: false),
                    int_sortx = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)0),
                    int_sorty = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)0),
                    int_kp = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_wettkaempfe_disposid", x => x.int_wettkaempfe_disposid);
                    table.ForeignKey(
                        name: "fky_wettkaempfe_x_disziplinenid",
                        column: x => x.int_wettkaempfe_x_disziplinenid,
                        principalTable: "tfx_wettkaempfe_x_disziplinen",
                        principalColumn: "int_wettkaempfe_x_disziplinenid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tfx_man_x_man_ab",
                columns: table => new
                {
                    int_man_x_man_abid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_mannschaftenid = table.Column<int>(type: "integer", nullable: false),
                    int_mannschaften_abzugid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_man_x_man_abid", x => x.int_man_x_man_abid);
                    table.ForeignKey(
                        name: "fky_mannschaften_abzugid",
                        column: x => x.int_mannschaften_abzugid,
                        principalTable: "tfx_mannschaften_abzug",
                        principalColumn: "int_mannschaften_abzugid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fky_mannschaftenid",
                        column: x => x.int_mannschaftenid,
                        principalTable: "tfx_mannschaften",
                        principalColumn: "int_mannschaftenid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tfx_gruppen_x_teilnehmer",
                columns: table => new
                {
                    int_gruppen_x_teilnehmerid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_gruppenid = table.Column<int>(type: "integer", nullable: false),
                    int_teilnehmerid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_gruppen_x_teilnehmerid", x => x.int_gruppen_x_teilnehmerid);
                    table.ForeignKey(
                        name: "fky_gruppenid",
                        column: x => x.int_gruppenid,
                        principalTable: "tfx_gruppen",
                        principalColumn: "int_gruppenid",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fky_teilnehmerid",
                        column: x => x.int_teilnehmerid,
                        principalTable: "tfx_teilnehmer",
                        principalColumn: "int_teilnehmerid",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tfx_man_x_teilnehmer",
                columns: table => new
                {
                    int_man_x_teilnehmerid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_mannschaftenid = table.Column<int>(type: "integer", nullable: false),
                    int_teilnehmerid = table.Column<int>(type: "integer", nullable: false),
                    int_runde = table.Column<short>(type: "smallint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_man_x_teilnehmerid", x => x.int_man_x_teilnehmerid);
                    table.ForeignKey(
                        name: "fky_mannschaftenid",
                        column: x => x.int_mannschaftenid,
                        principalTable: "tfx_mannschaften",
                        principalColumn: "int_mannschaftenid",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fky_teilnehmerid",
                        column: x => x.int_teilnehmerid,
                        principalTable: "tfx_teilnehmer",
                        principalColumn: "int_teilnehmerid",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tfx_wertungen",
                columns: table => new
                {
                    int_wertungenid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_wettkaempfeid = table.Column<int>(type: "integer", nullable: false),
                    int_teilnehmerid = table.Column<int>(type: "integer", nullable: true),
                    int_gruppenid = table.Column<int>(type: "integer", nullable: true),
                    int_mannschaftenid = table.Column<int>(type: "integer", nullable: true),
                    int_statusid = table.Column<int>(type: "integer", nullable: false),
                    int_runde = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)1),
                    int_startnummer = table.Column<int>(type: "integer", nullable: true),
                    bol_ak = table.Column<bool>(type: "boolean", nullable: true, defaultValue: false),
                    bol_startet_nicht = table.Column<bool>(type: "boolean", nullable: true, defaultValue: false),
                    var_riege = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    var_comment = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_wertungenid", x => x.int_wertungenid);
                    table.ForeignKey(
                        name: "fky_gruppenid",
                        column: x => x.int_gruppenid,
                        principalTable: "tfx_gruppen",
                        principalColumn: "int_gruppenid",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fky_mannschaftenid",
                        column: x => x.int_mannschaftenid,
                        principalTable: "tfx_mannschaften",
                        principalColumn: "int_mannschaftenid",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fky_statusid",
                        column: x => x.int_statusid,
                        principalTable: "tfx_status",
                        principalColumn: "int_statusid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fky_teilnehmerid",
                        column: x => x.int_teilnehmerid,
                        principalTable: "tfx_teilnehmer",
                        principalColumn: "int_teilnehmerid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fky_wettkaempfeid",
                        column: x => x.int_wettkaempfeid,
                        principalTable: "tfx_wettkaempfe",
                        principalColumn: "int_wettkaempfeid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tfx_jury_results",
                columns: table => new
                {
                    int_juryresultsid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_wertungenid = table.Column<int>(type: "integer", nullable: true),
                    int_disziplinen_felderid = table.Column<int>(type: "integer", nullable: true),
                    int_versuch = table.Column<short>(type: "smallint", nullable: true),
                    rel_leistung = table.Column<float>(type: "real", nullable: true),
                    int_kp = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_juryresultsid", x => x.int_juryresultsid);
                    table.ForeignKey(
                        name: "fky_disziplinen_felderid",
                        column: x => x.int_disziplinen_felderid,
                        principalTable: "tfx_disziplinen_felder",
                        principalColumn: "int_disziplinen_felderid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fky_wertungenid",
                        column: x => x.int_wertungenid,
                        principalTable: "tfx_wertungen",
                        principalColumn: "int_wertungenid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tfx_quali_leistungen",
                columns: table => new
                {
                    int_quali_leistungenid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_wertungenid = table.Column<int>(type: "integer", nullable: false),
                    int_disziplinenid = table.Column<int>(type: "integer", nullable: false),
                    rel_leistung = table.Column<float>(type: "real", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_quali_leistungenid", x => x.int_quali_leistungenid);
                    table.ForeignKey(
                        name: "fky_disziplinenid",
                        column: x => x.int_disziplinenid,
                        principalTable: "tfx_disziplinen",
                        principalColumn: "int_disziplinenid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "int_wertungenid",
                        column: x => x.int_wertungenid,
                        principalTable: "tfx_wertungen",
                        principalColumn: "int_wertungenid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tfx_startreihenfolge",
                columns: table => new
                {
                    int_startreihenfolgeid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_wertungenid = table.Column<int>(type: "integer", nullable: false),
                    int_disziplinenid = table.Column<int>(type: "integer", nullable: false),
                    int_pos = table.Column<short>(type: "smallint", nullable: true),
                    int_kp = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_startreihenfolge", x => x.int_startreihenfolgeid);
                    table.ForeignKey(
                        name: "fky_disziplinen",
                        column: x => x.int_disziplinenid,
                        principalTable: "tfx_disziplinen",
                        principalColumn: "int_disziplinenid",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fky_wertungenid",
                        column: x => x.int_wertungenid,
                        principalTable: "tfx_wertungen",
                        principalColumn: "int_wertungenid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tfx_wertungen_details",
                columns: table => new
                {
                    int_wertungen_detailsid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_wertungenid = table.Column<int>(type: "integer", nullable: false),
                    int_disziplinenid = table.Column<int>(type: "integer", nullable: false),
                    int_versuch = table.Column<short>(type: "smallint", nullable: true),
                    rel_leistung = table.Column<float>(type: "real", nullable: true),
                    int_kp = table.Column<short>(type: "smallint", nullable: true, defaultValue: (short)0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_wertungen_detailsid", x => x.int_wertungen_detailsid);
                    table.ForeignKey(
                        name: "fky_disziplinenid",
                        column: x => x.int_disziplinenid,
                        principalTable: "tfx_disziplinen",
                        principalColumn: "int_disziplinenid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fky_wertungenid",
                        column: x => x.int_wertungenid,
                        principalTable: "tfx_wertungen",
                        principalColumn: "int_wertungenid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tfx_wertungen_x_disziplinen",
                columns: table => new
                {
                    int_wertungen_x_disziplinenid = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    int_wertungenid = table.Column<int>(type: "integer", nullable: false),
                    int_disziplinenid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pky_wertungen_x_disziplinenid", x => x.int_wertungen_x_disziplinenid);
                    table.ForeignKey(
                        name: "fky_disziplinenid",
                        column: x => x.int_disziplinenid,
                        principalTable: "tfx_disziplinen",
                        principalColumn: "int_disziplinenid",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fky_wertungenid",
                        column: x => x.int_wertungenid,
                        principalTable: "tfx_wertungen",
                        principalColumn: "int_wertungenid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tfx_disgrp_x_disziplinen_int_disziplinen_gruppenid",
                table: "tfx_disgrp_x_disziplinen",
                column: "int_disziplinen_gruppenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_disgrp_x_disziplinen_int_disziplinenid",
                table: "tfx_disgrp_x_disziplinen",
                column: "int_disziplinenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_disziplinen_int_formelid",
                table: "tfx_disziplinen",
                column: "int_formelid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_disziplinen_int_sportid",
                table: "tfx_disziplinen",
                column: "int_sportid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_disziplinen_felder_int_disziplinenid",
                table: "tfx_disziplinen_felder",
                column: "int_disziplinenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_gaue_int_verbaendeid",
                table: "tfx_gaue",
                column: "int_verbaendeid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_gruppen_x_teilnehmer_int_gruppenid",
                table: "tfx_gruppen_x_teilnehmer",
                column: "int_gruppenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_gruppen_x_teilnehmer_int_teilnehmerid",
                table: "tfx_gruppen_x_teilnehmer",
                column: "int_teilnehmerid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_jury_results_int_disziplinen_felderid",
                table: "tfx_jury_results",
                column: "int_disziplinen_felderid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_jury_results_int_wertungenid",
                table: "tfx_jury_results",
                column: "int_wertungenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_layout_felder_int_layoutid",
                table: "tfx_layout_felder",
                column: "int_layoutid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_man_x_man_ab_int_mannschaften_abzugid",
                table: "tfx_man_x_man_ab",
                column: "int_mannschaften_abzugid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_man_x_man_ab_int_mannschaftenid",
                table: "tfx_man_x_man_ab",
                column: "int_mannschaftenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_man_x_teilnehmer_int_mannschaftenid",
                table: "tfx_man_x_teilnehmer",
                column: "int_mannschaftenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_man_x_teilnehmer_int_teilnehmerid",
                table: "tfx_man_x_teilnehmer",
                column: "int_teilnehmerid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_mannschaften_int_vereineid",
                table: "tfx_mannschaften",
                column: "int_vereineid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_mannschaften_int_wettkaempfeid",
                table: "tfx_mannschaften",
                column: "int_wettkaempfeid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_quali_leistungen_int_disziplinenid",
                table: "tfx_quali_leistungen",
                column: "int_disziplinenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_quali_leistungen_int_wertungenid",
                table: "tfx_quali_leistungen",
                column: "int_wertungenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_riegen_x_disziplinen_int_disziplinenid",
                table: "tfx_riegen_x_disziplinen",
                column: "int_disziplinenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_riegen_x_disziplinen_int_statusid",
                table: "tfx_riegen_x_disziplinen",
                column: "int_statusid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_riegen_x_disziplinen_int_veranstaltungenid",
                table: "tfx_riegen_x_disziplinen",
                column: "int_veranstaltungenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_startreihenfolge_int_disziplinenid",
                table: "tfx_startreihenfolge",
                column: "int_disziplinenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_startreihenfolge_int_wertungenid",
                table: "tfx_startreihenfolge",
                column: "int_wertungenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_teilnehmer_int_vereineid",
                table: "tfx_teilnehmer",
                column: "int_vereineid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_veranstaltungen_int_ansprechpartner",
                table: "tfx_veranstaltungen",
                column: "int_ansprechpartner");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_veranstaltungen_int_hauptwettkampf",
                table: "tfx_veranstaltungen",
                column: "int_hauptwettkampf");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_veranstaltungen_int_kontenid",
                table: "tfx_veranstaltungen",
                column: "int_kontenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_veranstaltungen_int_meldung_an",
                table: "tfx_veranstaltungen",
                column: "int_meldung_an");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_veranstaltungen_int_wettkampforteid",
                table: "tfx_veranstaltungen",
                column: "int_wettkampforteid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_verbaende_int_laenderid",
                table: "tfx_verbaende",
                column: "int_laenderid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_vereine_int_gaueid",
                table: "tfx_vereine",
                column: "int_gaueid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_vereine_int_personenid",
                table: "tfx_vereine",
                column: "int_personenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_wertungen_int_gruppenid",
                table: "tfx_wertungen",
                column: "int_gruppenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_wertungen_int_mannschaftenid",
                table: "tfx_wertungen",
                column: "int_mannschaftenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_wertungen_int_statusid",
                table: "tfx_wertungen",
                column: "int_statusid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_wertungen_int_teilnehmerid",
                table: "tfx_wertungen",
                column: "int_teilnehmerid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_wertungen_int_wettkaempfeid",
                table: "tfx_wertungen",
                column: "int_wettkaempfeid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_wertungen_details_int_disziplinenid",
                table: "tfx_wertungen_details",
                column: "int_disziplinenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_wertungen_details_int_wertungenid",
                table: "tfx_wertungen_details",
                column: "int_wertungenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_wertungen_x_disziplinen_int_disziplinenid",
                table: "tfx_wertungen_x_disziplinen",
                column: "int_disziplinenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_wertungen_x_disziplinen_int_wertungenid",
                table: "tfx_wertungen_x_disziplinen",
                column: "int_wertungenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_wettkaempfe_int_bereicheid",
                table: "tfx_wettkaempfe",
                column: "int_bereicheid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_wettkaempfe_int_veranstaltungenid",
                table: "tfx_wettkaempfe",
                column: "int_veranstaltungenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_wettkaempfe_dispos_int_wettkaempfe_x_disziplinenid",
                table: "tfx_wettkaempfe_dispos",
                column: "int_wettkaempfe_x_disziplinenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_wettkaempfe_x_disziplinen_int_disziplinenid",
                table: "tfx_wettkaempfe_x_disziplinen",
                column: "int_disziplinenid");

            migrationBuilder.CreateIndex(
                name: "IX_tfx_wettkaempfe_x_disziplinen_int_wettkaempfeid",
                table: "tfx_wettkaempfe_x_disziplinen",
                column: "int_wettkaempfeid");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tfx_disgrp_x_disziplinen");

            migrationBuilder.DropTable(
                name: "tfx_gruppen_x_teilnehmer");

            migrationBuilder.DropTable(
                name: "tfx_jury_results");

            migrationBuilder.DropTable(
                name: "tfx_layout_felder");

            migrationBuilder.DropTable(
                name: "tfx_man_x_man_ab");

            migrationBuilder.DropTable(
                name: "tfx_man_x_teilnehmer");

            migrationBuilder.DropTable(
                name: "tfx_quali_leistungen");

            migrationBuilder.DropTable(
                name: "tfx_riegen_x_disziplinen");

            migrationBuilder.DropTable(
                name: "tfx_startreihenfolge");

            migrationBuilder.DropTable(
                name: "tfx_wertungen_details");

            migrationBuilder.DropTable(
                name: "tfx_wertungen_x_disziplinen");

            migrationBuilder.DropTable(
                name: "tfx_wettkaempfe_dispos");

            migrationBuilder.DropTable(
                name: "tfx_disziplinen_gruppen");

            migrationBuilder.DropTable(
                name: "tfx_disziplinen_felder");

            migrationBuilder.DropTable(
                name: "tfx_layouts");

            migrationBuilder.DropTable(
                name: "tfx_mannschaften_abzug");

            migrationBuilder.DropTable(
                name: "tfx_wertungen");

            migrationBuilder.DropTable(
                name: "tfx_wettkaempfe_x_disziplinen");

            migrationBuilder.DropTable(
                name: "tfx_gruppen");

            migrationBuilder.DropTable(
                name: "tfx_mannschaften");

            migrationBuilder.DropTable(
                name: "tfx_status");

            migrationBuilder.DropTable(
                name: "tfx_teilnehmer");

            migrationBuilder.DropTable(
                name: "tfx_disziplinen");

            migrationBuilder.DropTable(
                name: "tfx_wettkaempfe");

            migrationBuilder.DropTable(
                name: "tfx_vereine");

            migrationBuilder.DropTable(
                name: "tfx_formeln");

            migrationBuilder.DropTable(
                name: "tfx_sport");

            migrationBuilder.DropTable(
                name: "tfx_bereiche");

            migrationBuilder.DropTable(
                name: "tfx_veranstaltungen");

            migrationBuilder.DropTable(
                name: "tfx_gaue");

            migrationBuilder.DropTable(
                name: "tfx_personen");

            migrationBuilder.DropTable(
                name: "tfx_konten");

            migrationBuilder.DropTable(
                name: "tfx_wettkampforte");

            migrationBuilder.DropTable(
                name: "tfx_verbaende");

            migrationBuilder.DropTable(
                name: "tfx_laender");
        }
    }
}
