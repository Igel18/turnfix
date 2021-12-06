#include "individualdialog.h"
#include "masterdata/athletemodel.h"
#include "masterdata/clubdialog.h"
#include "masterdata/clubmodel.h"
#include "masterdata/statusmodel.h"
#include "model/entity/athlete.h"
#include "model/entity/event.h"
#include "model/entitymanager.h"
#include "model/repository/athleterepository.h"
#include "model/repository/competitionrepository.h"
#include "model/repository/scorerepository.h"
#include "src/global/header/_global.h"
#include "ui_individualdialog.h"
#include <QMessageBox>
#include <QSqlQuery>
#include <QToolBar>
#include <QSortFilterProxyModel>

IndividualDialog::IndividualDialog(Event *tfEvent, EntityManager *em, int edit, QWidget* parent)
    : QDialog(parent), m_event(tfEvent), m_em(em), ui(new Ui::IndividualDialog)
{
    editid = edit;
    ui->setupUi(this);
    setWindowFlags(Qt::Dialog | Qt::CustomizeWindowHint | Qt::WindowTitleHint | Qt::WindowCloseButtonHint);

    auto tb = new QToolBar();
    auto ag = new QActionGroup(this);
    tb->setAllowedAreas(Qt::LeftToolBarArea);
    tb->setMovable(false);
    tb->setFloatable(false);
    tb->setToolButtonStyle(Qt::ToolButtonTextUnderIcon);
    tb->setOrientation(Qt::Vertical);
    tb->addAction(ui->act_tn);
    ag->addAction(ui->act_tn);
    tb->addAction(ui->act_dis);
    ag->addAction(ui->act_dis);
    ui->act_tn->setChecked(true);
    ui->sidebar->layout()->addWidget(tb);

    connect(ui->act_tn, &QAction::triggered, [this](){ ui->stackedWidget->setCurrentIndex(0); });
    connect(ui->act_dis, &QAction::triggered, [this](){ ui->stackedWidget->setCurrentIndex(1); });

    m_athletes = m_em->athleteRepository()->loadAll();
    for(auto& athlete: m_athletes){
        ui->cmb_name->addItem(athlete->fullName(), QVariant::fromValue(athlete));
    }

    ui->cmb_name->setCurrentIndex( -1 );

    ui->cmb_sex->addItem( "weiblich", 0 );
    ui->cmb_sex->addItem( "männlich", 1 );

    auto clubModel = new ClubModel(m_em, this);
    clubModel->fetchClubs();
    ui->cmb_club->setModel( clubModel );
    ui->cmb_club->setCurrentIndex( -1 );

    int type = 0;
    const auto competitions = m_em->competitionRepository()->fetchByEvent( m_event, &type );
    for( auto& competition: competitions ){
        auto competitionTitle = QString( "%1 %2" ).arg(competition->number(), competition->name());
        ui->cmb_wk->addItem( competitionTitle, competition->id() );
    }

    auto statusModel = new StatusModel(m_em, this);
    bool bScorecard = true;
    statusModel->fetchStatuses(&bScorecard);
    ui->cmb_status->setModel(statusModel);

    connect(ui->cmb_wk, SIGNAL(currentIndexChanged(int)), this, SLOT(checkDisziplinen()));
    connect(ui->cmb_wk, SIGNAL(currentIndexChanged(int)), this, SLOT(checkJg()));
    connect(ui->but_save, SIGNAL(clicked()), this, SLOT(save()));
    connect(ui->cmb_name, SIGNAL(editTextChanged(QString)), this, SLOT(checkUpdate()));
    connect(ui->dae_year, SIGNAL(dateChanged(QDate)), this, SLOT(checkJg()));
    connect(ui->chk_dat, SIGNAL(stateChanged(int)), this, SLOT(changeDat()));
    connect(ui->but_addclub, SIGNAL(clicked()), this, SLOT(addClub()));

    initData();
}

IndividualDialog::~IndividualDialog()
{
    delete ui;
}

void IndividualDialog::changeDat() {
    if (ui->chk_dat->isChecked()) {
        ui->dae_year->setDisplayFormat("dd.MM.yyyy");
        ui->dae_year->setCalendarPopup(true);
    } else {
        ui->dae_year->setDisplayFormat("yyyy");
        ui->dae_year->setCalendarPopup(false);
    }
}

void IndividualDialog::initData() {
    checkDisziplinen();

    if (editid != 0) {
        QSqlQuery query3;
        query3.prepare("SELECT var_nachname || ', ' || var_vorname, int_wettkaempfeid, var_riege, bol_ak, int_startpassnummer, bol_startet_nicht, int_statusid, var_comment FROM tfx_wertungen INNER JOIN tfx_teilnehmer USING (int_teilnehmerid) WHERE int_wertungenid=?");
        query3.bindValue(0,editid);
        query3.exec();
        query3.next();
        ui->cmb_name->setEditText(query3.value(0).toString());
        ui->cmb_wk->setCurrentIndex(ui->cmb_wk->findData(query3.value(1).toInt()));
        ui->txt_rg->setText(query3.value(2).toString());
        ui->txt_id->setText(query3.value(4).toString());
        ui->chk_ak->setChecked(query3.value(3).toBool());
        ui->chk_nostart->setChecked(query3.value(5).toBool());
        ui->cmb_status->setCurrentIndex(ui->cmb_status->findData(query3.value(6).toInt()));
        ui->txt_comment->setText(query3.value(7).toString());
        QObject::disconnect(ui->cmb_name, nullptr, nullptr, nullptr);
    }
}

void IndividualDialog::save() {
    auto pAthlete = qvariant_cast<Athlete*>(ui->cmb_name->currentData(TF::ObjectRole));

    if( !pAthlete ){
        pAthlete = new Athlete();
    }

    auto clubId = ui->cmb_club->currentData(TF::IdRole).toInt();
    auto fullName = ui->cmb_name->currentText();
    auto firstName = _global::nameSplit(fullName).at(0).toString();
    auto lastName = _global::nameSplit(fullName).at(1).toString();
    auto gender = ui->cmb_sex->currentIndex();
    auto birthDate = ui->dae_year->date();
    auto startNumber = ui->txt_id->text().trimmed();
    if( startNumber.isEmpty() ){
        startNumber = "0";
    }
    auto yearOnly = !ui->chk_dat->isChecked();

    pAthlete->setClubId(clubId);
    pAthlete->setFirstName(firstName);
    pAthlete->setLastName(lastName);
    pAthlete->setGender(gender);
    pAthlete->setDateOfBirth(birthDate);
    pAthlete->setLicense(startNumber);
    pAthlete->setYearOfBirthOnly(yearOnly);

    m_em->athleteRepository()->persist(pAthlete);

    const auto competitions = m_em->competitionRepository()->fetchByEvent(m_event);

    QList< Score* > scores;

    for(auto& competition: competitions){
        int competitionId = competition->id();
        scores.append(m_em->scoreRepository()->fetch(&competitionId));
    }

    auto itFound = std::find_if(scores.begin(), scores.end(), [pAthlete](Score* pScore){
            return pScore->athleteId() == pAthlete->id();
    });

    bool bOk = true;

    if(itFound != scores.end()){
        bOk = QMessageBox::Yes == QMessageBox::warning(
                    this,
                    tr("Teilnehmer vorhanden!"),
                    tr("Dieser Teilnehmer ist bereits für diese Veranstaltung eingetragen! Soll er trotzdem hinzugefügt werden?"),
                    QMessageBox::Yes|QMessageBox::No);
    }

    int maxStartNumber = 0;

    for(auto& score: scores){
        if (score->round() == m_event->round() ){
            maxStartNumber = std::max(maxStartNumber, score->bib());
        }
    }

    auto pScore = new Score();

    pScore->setAthleteId(pAthlete->id());
    pScore->setCompetitionId(ui->cmb_wk->itemData(ui->cmb_wk->currentIndex()).toInt());
    pScore->setSquad(ui->txt_rg->text());
    pScore->setNonCompetitive(ui->chk_ak->isChecked());
    pScore->setBib(++maxStartNumber);
    pScore->setDns(ui->chk_nostart->isChecked());
    pScore->setRound(m_event->round());
    pScore->setStatusId(ui->cmb_status->itemData(ui->cmb_status->currentIndex(), TF::IdRole).toInt());
    pScore->setComment(ui->txt_comment->text());

    m_em->scoreRepository()->persist(pScore);

    done(1);

    //----
    if (ui->txt_id->text() == ""){
        ui->txt_id->setText("0");
    }

    if (editid == 0) {
//        QSqlQuery query2;
//        query2.prepare("SELECT int_teilnehmerid FROM tfx_teilnehmer INNER JOIN tfx_vereine USING (int_vereineid) WHERE var_nachname || ', ' || var_vorname=? AND tfx_vereine.var_name=? LIMIT 1");
//        query2.bindValue(0, ui->cmb_name->currentText());
//        query2.bindValue(1, ui->cmb_club->currentText());
//        query2.exec();
//        int tnid = 0;
//        if (_global::querySize(query2) > 0) {
//            query2.next();
//            tnid = query2.value(0).toInt();
//            QSqlQuery query3;
//            query3.prepare("UPDATE tfx_teilnehmer SET int_startpassnummer=?,dat_geburtstag=? WHERE int_teilnehmerid=?");
//            query3.bindValue(0, ui->txt_id->text());
//            query3.bindValue(1, ui->dae_year->date().toString("yyyy-MM-dd"));
//            query3.bindValue(2,tnid);
//            query3.exec();
//        } else {
//            int vid = ui->cmb_club->itemData(ui->cmb_club->currentIndex()).toInt();
//            QSqlQuery query6;
//            query6.prepare("INSERT INTO tfx_teilnehmer (int_vereineid,var_vorname,var_nachname,int_geschlecht,dat_geburtstag,int_startpassnummer,bool_nur_jahr) VALUES (?,?,?,?,?,?,?)");
//            query6.bindValue(0,vid);
//            query6.bindValue(1,_global::nameSplit(ui->cmb_name->currentText()).at(0));
//            query6.bindValue(2,_global::nameSplit(ui->cmb_name->currentText()).at(1));
//            query6.bindValue(3, ui->cmb_sex->currentIndex());
//            query6.bindValue(4, ui->dae_year->date().toString("yyyy-MM-dd"));
//            query6.bindValue(5, ui->txt_id->text());
//            query6.bindValue(6, !ui->chk_dat->isChecked());
//            query6.exec();
//            if (_global::getDBTyp() == 0) {
//                QSqlQuery query7("SELECT last_value FROM tfx_teilnehmer_int_teilnehmerid_seq");
//                query7.next();
//                tnid = query7.value(0).toInt();
//            } else {
//                tnid = query6.lastInsertId().toInt();
//            }
//        }
//        QSqlQuery query10;
//        query10.prepare("SELECT tfx_teilnehmer.int_teilnehmerid FROM tfx_wertungen INNER JOIN tfx_wettkaempfe USING (int_wettkaempfeid) INNER JOIN tfx_veranstaltungen USING (int_veranstaltungenid) INNER JOIN tfx_teilnehmer ON tfx_teilnehmer.int_teilnehmerid = tfx_wertungen.int_teilnehmerid WHERE int_veranstaltungenid=? AND tfx_teilnehmer.int_teilnehmerid=?");
//        query10.bindValue(0, this->m_event->id());
//        query10.bindValue(1, tnid);
//        query10.exec();
//        bool cont = true;
//        if (_global::querySize(query10) > 0) {
//            QMessageBox msg(QMessageBox::Warning, "Teilnehmer vorhanden!", "Dieser Teilnehmer ist bereits für diese Veranstaltung eingetragen! Soll er trotzdem hinzugefügt werden?", QMessageBox::Yes | QMessageBox::No);
//            int ret = msg.exec();
//            if (ret == QMessageBox::No) cont = false;
//        }
//        if (cont) {
//            QSqlQuery query2;
//            query2.prepare("SELECT MAX(int_startnummer) FROM tfx_wertungen INNER JOIN tfx_wettkaempfe USING (int_wettkaempfeid) WHERE int_veranstaltungenid=? AND int_runde=?");
//            query2.bindValue(0, this->m_event->mainEvent()->id());
//            query2.bindValue(1, this->m_event->round());
//            query2.exec();
//            query2.next();
//            QSqlQuery query;
//            query.prepare("INSERT INTO tfx_wertungen (int_teilnehmerid,int_wettkaempfeid,var_riege,bol_ak,int_startnummer,bol_startet_nicht,int_runde, int_statusid,var_comment) VALUES(?,?,?,?,?,?,?,?,?)");
//            query.bindValue( 0, tnid );
//            query.bindValue( 1, ui->cmb_wk->itemData(ui->cmb_wk->currentIndex()).toInt() );
//            query.bindValue( 2, ui->txt_rg->text() );
//            query.bindValue( 3, ui->chk_ak->isChecked() );
//            query.bindValue( 4, (query2.value(0).toInt()+1) );
//            query.bindValue( 5, ui->chk_nostart->isChecked());
//            query.bindValue( 6, this->m_event->round());
//            query.bindValue( 7, ui->cmb_status->itemData(ui->cmb_status->currentIndex()));
//            query.bindValue( 8, ui->txt_comment->text());
//            query.exec();
//            int wert;
//            if (_global::getDBTyp() == 0) {
//                QSqlQuery query11("SELECT last_value FROM tfx_wertungen_int_wertungenid_seq");
//                query11.next();
//                wert = query11.value(0).toInt();
//            } else {
//                wert = query.lastInsertId().toInt();
//            }


//            bool all = true;
//            for (int i=0;i<ui->lst_dis->count();i++) {
//                if (ui->lst_dis->item(i)->checkState() == Qt::Unchecked) {
//                    all = false;
//                    break;
//                }
//            }
//            if (!all) {
//                for (int i=0;i<ui->lst_dis->count();i++) {
//                    if (ui->lst_dis->item(i)->checkState() == Qt::Checked) {
//                        query.prepare("INSERT INTO tfx_wertungen_x_disziplinen (int_wertungenid,int_disziplinenid) VALUES(?,?)");
//                        query.bindValue(0,wert);
//                        query.bindValue(1,ui->lst_dis->item(i)->data(Qt::UserRole).toInt());
//                        query.exec();
//                    }
//                }
//            }
//            done(1);
//        }
    } else {
        QSqlQuery query2;
        query2.prepare("SELECT int_teilnehmerid FROM tfx_wertungen WHERE int_wertungenid=?");
        query2.bindValue(0,editid);
        query2.exec();
        query2.next();
        int vid = ui->cmb_club->itemData(ui->cmb_club->currentIndex()).toInt();
        QSqlQuery query6;
        query6.prepare("UPDATE tfx_teilnehmer SET int_vereineid=?, var_vorname=?, var_nachname=?, int_geschlecht=?, dat_geburtstag=?, int_startpassnummer=?, bool_nur_jahr=? WHERE int_teilnehmerid=?");
        query6.bindValue(0, vid);
        query6.bindValue(1, _global::nameSplit(ui->cmb_name->currentText()).at(0));
        query6.bindValue(2, _global::nameSplit(ui->cmb_name->currentText()).at(1));
        query6.bindValue(3, ui->cmb_sex->currentIndex());
        query6.bindValue(4, ui->dae_year->date().toString("yyyy-MM-dd"));
        query6.bindValue(5, ui->txt_id->text());
        query6.bindValue(6, !ui->chk_dat->isChecked());
        query6.bindValue(7, query2.value(0).toInt());
        query6.exec();
        query6.prepare("UPDATE tfx_wertungen SET int_wettkaempfeid=?, var_riege=?, bol_ak=?, bol_startet_nicht=?, int_statusid=?, var_comment=? WHERE int_wertungenid=?");
        query6.bindValue(0, ui->cmb_wk->itemData(ui->cmb_wk->currentIndex()));
        query6.bindValue(1, ui->txt_rg->text());
        query6.bindValue(2, ui->chk_ak->isChecked());
        query6.bindValue(3, ui->chk_nostart->isChecked());
        query6.bindValue(4, ui->cmb_status->itemData(ui->cmb_status->currentIndex()).toInt());
        query6.bindValue(5, ui->txt_comment->text());
        query6.bindValue(6, editid);
        query6.exec();
        bool all = true;
        for (int i=0;i<ui->lst_dis->count();i++) {
            if (ui->lst_dis->item(i)->checkState() == Qt::Unchecked) {
                all = false;
                break;
            }
        }
        if (!all) {
            for (int i=0;i<ui->lst_dis->count();i++) {
                QSqlQuery query7;
                query7.prepare("SELECT * FROM tfx_wertungen_x_disziplinen WHERE int_wertungenid=? AND int_disziplinenid=?");
                query7.bindValue(0, editid);
                query7.bindValue(1, ui->lst_dis->item(i)->data(Qt::UserRole).toInt());
                query7.exec();
                if (_global::querySize(query7) == 0 && ui->lst_dis->item(i)->checkState() == Qt::Checked) {
                    QSqlQuery query8;
                    query8.prepare("INSERT INTO tfx_wertungen_x_disziplinen (int_wertungenid,int_disziplinenid) VALUES(?,?)");
                    query8.bindValue(0, editid);
                    query8.bindValue(1, ui->lst_dis->item(i)->data(Qt::UserRole).toInt());
                    query8.exec();
                }
            }
            QSqlQuery query9;
            query9.prepare("SELECT * FROM tfx_wertungen_x_disziplinen WHERE int_wertungenid=?");
            query9.bindValue(0,editid);
            query9.exec();
            while (query9.next()) {
                int test = 0;
                for (int i=0;i<ui->lst_dis->count();i++) {
                    if (ui->lst_dis->item(i)->data(Qt::UserRole).toInt() == query9.value(2).toInt()){
                        QSqlQuery query10;
                        query10.prepare("SELECT int_disziplinenid FROM tfx_wertungen_x_disziplinen WHERE int_wertungenid=? AND int_disziplinenid=? LIMIT 1");
                        query10.bindValue(0,editid);
                        query10.bindValue(1,ui->lst_dis->item(i)->data(Qt::UserRole).toInt());
                        query10.exec();
                        query10.next();
                        if (_global::querySize(query10) > 0 && ui->lst_dis->item(i)->checkState() == Qt::Checked) {
                            test = 1;
                            break;
                        } else {
                            test = 0;
                        }
                    }
                }
                if (test == 0) {
                    QSqlQuery query11;
                    query11.prepare("DELETE FROM tfx_wertungen_details WHERE int_wertungenid=? AND int_disziplinenid=?");
                    query11.bindValue(0,editid);
                    query11.bindValue(1,query9.value(2).toInt());
                    query11.exec();
                    query11.prepare("DELETE FROM tfx_wertungen_x_disziplinen WHERE int_wertungen_x_disziplinenid=?");
                    query11.bindValue(0,query9.value(0).toInt());
                    query11.exec();
                }
            }
            QSqlQuery query12;
            query12.prepare("DELETE FROM tfx_wertungen_details WHERE int_wertungenid=? AND int_disziplinenid NOT IN (SELECT int_disziplinenid FROM tfx_wertungen_x_disziplinen WHERE int_wertungenid=?)");
            query12.bindValue(0,editid);
            query12.bindValue(1,editid);
            query12.exec();
        } else {
            QSqlQuery query11;
            query11.prepare("DELETE FROM tfx_wertungen_x_disziplinen WHERE int_wertungen_x_disziplinenid=?");
            query11.bindValue(0,editid);
            query11.exec();
        }

    }

    done(1);
}

void IndividualDialog::checkUpdate() {
    auto userInput = ui->cmb_name->currentText();
    auto itFound = std::find_if(m_athletes.begin(), m_athletes.end(), [userInput](const Athlete* item){
        return QString("%1 %2").arg(item->firstName(), item->lastName()).contains(userInput, Qt::CaseInsensitive);
    });

    if(!userInput.trimmed().isEmpty() && itFound != m_athletes.end()){
        const auto foundAthlete = *itFound;
        ui->cmb_sex->setCurrentIndex(foundAthlete->gender());
        ui->dae_year->setDate(foundAthlete->dateOfBirth());
        ui->txt_id->setText(foundAthlete->license());
        auto clubIdx = ui->cmb_club->findData(foundAthlete->clubId(), TF::IdRole);
        ui->cmb_club->setCurrentIndex(clubIdx);
        ui->chk_dat->setChecked(foundAthlete->yearOfBirthOnly());
    } else {
        ui->cmb_sex->setCurrentIndex(0);
        ui->dae_year->clear();
        ui->cmb_club->setCurrentIndex(-1);
        ui->txt_id->setText("");
        ui->chk_dat->setChecked(false);
    }
//    QSqlQuery query;
//    query.prepare("SELECT * FROM tfx_teilnehmer WHERE var_nachname || ', ' || var_vorname = ?");
//    query.bindValue( 0, ui->cmb_name->currentText());
//    query.exec();
//    if (_global::querySize(query) > 0) {
//        query.next();
//        ui->cmb_sex->setCurrentIndex(query.value(4).toInt());
//        ui->dae_year->setDate(QDate().fromString(query.value(5).toString(), "yyyy-MM-dd"));
//        ui->txt_id->setText(query.value(7).toString());
//        ui->cmb_club->setCurrentIndex(ui->cmb_club->findData(query.value(1).toInt()));
//        ui->chk_dat->setChecked(!query.value(6).toBool());
//    } else {
//        ui->cmb_sex->setCurrentIndex(0);
//        ui->dae_year->clear();
//        ui->cmb_club->setCurrentIndex(ui->cmb_club->findData(0));
//        ui->txt_id->setText("");
//        ui->chk_dat->setChecked(false);
//    }
}

void IndividualDialog::checkJg() {
    if (ui->dae_year->date().isValid()) {
        QSqlQuery query;
        query.prepare("SELECT yer_von, yer_bis FROM tfx_wettkaempfe WHERE int_wettkaempfeid=?");
        query.bindValue(0,ui->cmb_wk->itemData(ui->cmb_wk->currentIndex()));
        query.exec();
        query.next();
        if (query.value(1).toInt() == 2) {
            if (ui->dae_year->date().toString("yyyy").toInt() < query.value(0).toInt()) {
                ui->lbl_control->setStyleSheet("QLabel { background-color: red }\nQLabel { color: white }");
                ui->lbl_control->setText("Jahrgangsüberprüfung fehlgeschlagen!");
            } else {
                ui->lbl_control->setStyleSheet("");
                ui->lbl_control->setText("");
            }
        } else if (query.value(1).toInt() == 1) {
            if (ui->dae_year->date().toString("yyyy").toInt() > query.value(0).toInt()) {
                ui->lbl_control->setStyleSheet("QLabel { background-color: red }\nQLabel { color: white }");
                ui->lbl_control->setText("Jahrgangsüberprüfung fehlgeschlagen!");
            } else {
                ui->lbl_control->setStyleSheet("");
                ui->lbl_control->setText("");
            }
        } else if (query.value(1).toInt() != 3) {
            if ((query.value(0).toInt() >= query.value(1).toInt() && query.value(1).toInt() <= ui->dae_year->date().toString("yyyy").toInt() && ui->dae_year->date().toString("yyyy").toInt() <= query.value(0).toInt()) || (query.value(0).toInt() < query.value(1).toInt() && query.value(1).toInt() >= ui->dae_year->date().toString("yyyy").toInt() && ui->dae_year->date().toString("yyyy").toInt() >= query.value(0).toInt())) {
                ui->lbl_control->setStyleSheet("");
                ui->lbl_control->setText("");
            } else {
                ui->lbl_control->setStyleSheet("QLabel { background-color: red }\nQLabel { color: white }");
                ui->lbl_control->setText("Jahrgangsüberprüfung fehlgeschlagen!");
            }
        } else {
            ui->lbl_control->setStyleSheet("");
            ui->lbl_control->setText("");
        }
    }
}

void IndividualDialog::checkDisziplinen() {
    return;

    ui->lst_dis->clear();
    QSqlQuery query;
    query.prepare("SELECT int_disziplinenid, var_name FROM tfx_disziplinen INNER JOIN tfx_wettkaempfe_x_disziplinen USING (int_disziplinenid) WHERE int_wettkaempfeid=? ORDER BY int_sportid, int_disziplinenid");
    query.bindValue(0, ui->cmb_wk->itemData(ui->cmb_wk->currentIndex()));
    query.exec();
    while (query.next()) {
        QListWidgetItem *item = new QListWidgetItem();
        item->setData(Qt::UserRole,query.value(0).toInt());
        item->setText(query.value(1).toString());
        item->setFlags(item->flags() | Qt::ItemIsUserCheckable);
        item->setCheckState(Qt::Checked);
        ui->lst_dis->addItem(item);
    }
    query.prepare("SELECT bol_wahlwettkampf FROM tfx_wettkaempfe WHERE int_wettkaempfeid=?");
    query.bindValue(0, ui->cmb_wk->itemData(ui->cmb_wk->currentIndex()));
    query.exec();
    query.next();
    ui->act_dis->setEnabled(query.value(0).toBool());
    if (editid != 0) {
        for (int i=0;i<ui->lst_dis->count();i++) {
            ui->lst_dis->item(i)->setCheckState(Qt::Unchecked);
        }
        QSqlQuery query2;
        query2.prepare("SELECT int_disziplinenid FROM tfx_wertungen_x_disziplinen WHERE int_wertungenid=?");
        query2.bindValue(0,editid);
        query2.exec();
        if (_global::querySize(query2) > 0) {
            while (query2.next()) {
                for (int i=0;i<ui->lst_dis->count();i++) {
                    if (ui->lst_dis->item(i)->data(Qt::UserRole).toInt() == query2.value(0).toInt()) {
                        ui->lst_dis->item(i)->setCheckState(Qt::Checked);
                        break;
                    }
                }
            }
        } else {
            for (int i=0;i<ui->lst_dis->count();i++) {
                ui->lst_dis->item(i)->setCheckState(Qt::Checked);
            }
        }
    }
}

void IndividualDialog::addClub() {
    //TODO reenable
    //ClubDialog *pe = new ClubDialog(0, this);
    //if(pe->exec() == 1) { updateClubs(); }
}
