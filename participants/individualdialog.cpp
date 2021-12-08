#include "individualdialog.h"
#include "competitions/competitionmodel.h"
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
#include "participantswidget.h"
#include <QMessageBox>
#include <QSqlQuery>
#include <QToolBar>
#include <QSortFilterProxyModel>

IndividualDialog::IndividualDialog(Event *tfEvent, EntityManager *em, Score* pScore, QWidget* parent)
    : QDialog(parent), ui(new Ui::IndividualDialog), m_event(tfEvent), m_em(em), m_pScore(pScore)
{
    ui->setupUi(this);

    setWindowFlags(Qt::Dialog | Qt::CustomizeWindowHint | Qt::WindowTitleHint | Qt::WindowCloseButtonHint);

    auto tb = new QToolBar(this);
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

    connect(ui->act_tn, &QAction::triggered, this, [this](){ ui->stackedWidget->setCurrentIndex(0); });
    connect(ui->act_dis, &QAction::triggered, this, [this](){ ui->stackedWidget->setCurrentIndex(1); });

    connect(ui->cmb_wk, qOverload<int>(&QComboBox::currentIndexChanged), this, &IndividualDialog::updateDisciplins);
    connect(ui->cmb_wk, qOverload<int>(&QComboBox::currentIndexChanged), this, &IndividualDialog::checkJg);
    connect(ui->but_save, &QPushButton::clicked, this, &IndividualDialog::save);
    connect(ui->dae_year, &QDateEdit::dateChanged, this, &IndividualDialog::checkJg);
    connect(ui->chk_dat, &QCheckBox::stateChanged, this, [this](){
        ui->dae_year->setCalendarPopup(ui->chk_dat->isChecked());
        ui->dae_year->setDisplayFormat(ui->chk_dat->isChecked() ? "dd.MM.yyyy" : "yyyy");
    });

    connect(ui->but_addclub, SIGNAL(clicked()), this, SLOT(addClub()));

    auto pAthleteModel = new AthleteModel(m_em, this);
    pAthleteModel->fetchAthletes();
    ui->cmb_name->setModel(pAthleteModel);
    connect(ui->cmb_name, &QComboBox::editTextChanged, this, &IndividualDialog::updateAthleteInfo);

    ui->cmb_sex->addItem( "weiblich", 0 );
    ui->cmb_sex->addItem( "männlich", 1 );

    auto pClubModel = new ClubModel(m_em, this);
    pClubModel->fetchClubs();
    ui->cmb_club->setModel( pClubModel );

    auto athleteIdx = m_pScore ? ui->cmb_name->findData( m_pScore->athleteId(), TF::IdRole ) : -1;
    ui->cmb_name->setCurrentIndex( athleteIdx );

    int competitionIdx = -1;
    int competitionType = 0;

    const auto competitions = m_em->competitionRepository()->fetchByEvent( m_event, &competitionType );

    for( auto competition: competitions ){
        auto competitionTitle = QString( "%1 %2" ).arg(competition->number(), competition->name());

        ui->cmb_wk->addItem( competitionTitle, QVariant::fromValue(competition) );
        if( m_pScore && ( competition->id() == m_pScore->competitionId()) ){
            competitionIdx = ui->cmb_wk->count() - 1;
        }
    }

    ui->cmb_wk->setCurrentIndex( competitionIdx );

    ui->txt_rg->setText( m_pScore ? m_pScore->squad() : "" );

    auto statusModel = new StatusModel(m_em, this);
    bool bScorecard = true;
    statusModel->fetchStatuses(&bScorecard);
    ui->cmb_status->setModel(statusModel);

    auto statusIdx = m_pScore ? ui->cmb_status->findData( m_pScore->statusId(), TF::IdRole ) : -1;
    ui->cmb_status->setCurrentIndex( statusIdx );

    ui->chk_ak->setChecked( m_pScore ? m_pScore->nonCompetitive() : false );
    ui->chk_nostart->setChecked( m_pScore ? m_pScore->dns() : false );
    ui->txt_comment->setText( m_pScore ? m_pScore->comment() : "" );
}

IndividualDialog::~IndividualDialog()
{
    delete ui;
}

void IndividualDialog::save() {

    auto clubId = ui->cmb_club->currentData(TF::IdRole).toInt();
    auto pCompetition = qvariant_cast< Competition* >(ui->cmb_wk->currentData(TF::ObjectRole));
    auto competitionId = pCompetition ? pCompetition->id() : -1;
    auto statusId = ui->cmb_status->currentData(TF::IdRole).toInt();

    if( (clubId <= 0) || (competitionId <= 0) || (statusId <= 0) ){
        // msgbox with warning?
        return;
    }

    auto pAthlete = qvariant_cast<Athlete*>(ui->cmb_name->currentData(TF::ObjectRole));

    if( !pAthlete ){
        pAthlete = new Athlete();
    }

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

    if( !m_em->athleteRepository()->persist(pAthlete) ){
        return;
    }

    const auto competitions = m_em->competitionRepository()->fetchByEvent(m_event);

    QList< Score* > existingScores;

    for(auto& competition: competitions){
        int competitionId = competition->id();
        existingScores.append(m_em->scoreRepository()->fetch(&competitionId));
    }

    int currentScoreId = m_pScore ? m_pScore->id() : 0;

    auto itFound = std::find_if(existingScores.begin(), existingScores.end(), [pAthlete, currentScoreId](Score* pScore){
        // find existing score with the same athlete (athletes duplication)
        return (pScore->id() != currentScoreId) && (pScore->athleteId() == pAthlete->id());
    });

    bool bOk = true;

    if(itFound != existingScores.end()){
        auto title = tr("Teilnehmer vorhanden!");
        auto text = tr("Dieser Teilnehmer ist bereits für diese Veranstaltung eingetragen! Soll er trotzdem hinzugefügt werden?");
        QMessageBox msg(QMessageBox::Warning, title, text, QMessageBox::Yes|QMessageBox::No);
        bOk = msg.exec() == QMessageBox::Yes;
    }

    if( !bOk ){
        return;
    }

    if(!m_pScore){  // add new participant
        int maxStartNumber = 0;

        for(auto& score: existingScores){
            if (score->round() == m_event->round() ){
                maxStartNumber = std::max(maxStartNumber, score->bib());
            }
        }

        m_pScore = new Score();
        m_pScore->setBib(++maxStartNumber);
    }

    m_pScore->setAthleteId(pAthlete->id());

    m_pScore->setCompetitionId( competitionId );
    m_pScore->setSquad(ui->txt_rg->text());
    m_pScore->setNonCompetitive(ui->chk_ak->isChecked());
    m_pScore->setDns(ui->chk_nostart->isChecked());
    m_pScore->setRound(m_event->round());

    m_pScore->setStatusId(statusId);
    m_pScore->setComment(ui->txt_comment->text());

    m_em->scoreRepository()->persist(m_pScore);

    done(1);

    //----
//    if (m_pScore == nullptr) { // add new
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
//    } else { // edit
//        QSqlQuery query2;
//        query2.prepare("SELECT int_teilnehmerid FROM tfx_wertungen WHERE int_wertungenid=?");
//        query2.bindValue(0,editid);
//        query2.exec();
//        query2.next();
//        int vid = ui->cmb_club->itemData(ui->cmb_club->currentIndex()).toInt();
//        QSqlQuery query6;
//        query6.prepare("UPDATE tfx_teilnehmer SET int_vereineid=?, var_vorname=?, var_nachname=?, int_geschlecht=?, dat_geburtstag=?, int_startpassnummer=?, bool_nur_jahr=? WHERE int_teilnehmerid=?");
//        query6.bindValue(0, vid);
//        query6.bindValue(1, _global::nameSplit(ui->cmb_name->currentText()).at(0));
//        query6.bindValue(2, _global::nameSplit(ui->cmb_name->currentText()).at(1));
//        query6.bindValue(3, ui->cmb_sex->currentIndex());
//        query6.bindValue(4, ui->dae_year->date().toString("yyyy-MM-dd"));
//        query6.bindValue(5, ui->txt_id->text());
//        query6.bindValue(6, !ui->chk_dat->isChecked());
//        query6.bindValue(7, query2.value(0).toInt());
//        query6.exec();
//        query6.prepare("UPDATE tfx_wertungen SET int_wettkaempfeid=?, var_riege=?, bol_ak=?, bol_startet_nicht=?, int_statusid=?, var_comment=? WHERE int_wertungenid=?");
//        query6.bindValue(0, ui->cmb_wk->itemData(ui->cmb_wk->currentIndex()));
//        query6.bindValue(1, ui->txt_rg->text());
//        query6.bindValue(2, ui->chk_ak->isChecked());
//        query6.bindValue(3, ui->chk_nostart->isChecked());
//        query6.bindValue(4, ui->cmb_status->itemData(ui->cmb_status->currentIndex()).toInt());
//        query6.bindValue(5, ui->txt_comment->text());
//        query6.bindValue(6, editid);
//        query6.exec();
//        bool all = true;
//        for (int i=0;i<ui->lst_dis->count();i++) {
//            if (ui->lst_dis->item(i)->checkState() == Qt::Unchecked) {
//                all = false;
//                break;
//            }
//        }
//        if (!all) {
//            for (int i=0;i<ui->lst_dis->count();i++) {
//                QSqlQuery query7;
//                query7.prepare("SELECT * FROM tfx_wertungen_x_disziplinen WHERE int_wertungenid=? AND int_disziplinenid=?");
//                query7.bindValue(0, editid);
//                query7.bindValue(1, ui->lst_dis->item(i)->data(Qt::UserRole).toInt());
//                query7.exec();
//                if (_global::querySize(query7) == 0 && ui->lst_dis->item(i)->checkState() == Qt::Checked) {
//                    QSqlQuery query8;
//                    query8.prepare("INSERT INTO tfx_wertungen_x_disziplinen (int_wertungenid,int_disziplinenid) VALUES(?,?)");
//                    query8.bindValue(0, editid);
//                    query8.bindValue(1, ui->lst_dis->item(i)->data(Qt::UserRole).toInt());
//                    query8.exec();
//                }
//            }
//            QSqlQuery query9;
//            query9.prepare("SELECT * FROM tfx_wertungen_x_disziplinen WHERE int_wertungenid=?");
//            query9.bindValue(0,editid);
//            query9.exec();
//            while (query9.next()) {
//                int test = 0;
//                for (int i=0;i<ui->lst_dis->count();i++) {
//                    if (ui->lst_dis->item(i)->data(Qt::UserRole).toInt() == query9.value(2).toInt()){
//                        QSqlQuery query10;
//                        query10.prepare("SELECT int_disziplinenid FROM tfx_wertungen_x_disziplinen WHERE int_wertungenid=? AND int_disziplinenid=? LIMIT 1");
//                        query10.bindValue(0,editid);
//                        query10.bindValue(1,ui->lst_dis->item(i)->data(Qt::UserRole).toInt());
//                        query10.exec();
//                        query10.next();
//                        if (_global::querySize(query10) > 0 && ui->lst_dis->item(i)->checkState() == Qt::Checked) {
//                            test = 1;
//                            break;
//                        } else {
//                            test = 0;
//                        }
//                    }
//                }
//                if (test == 0) {
//                    QSqlQuery query11;
//                    query11.prepare("DELETE FROM tfx_wertungen_details WHERE int_wertungenid=? AND int_disziplinenid=?");
//                    query11.bindValue(0,editid);
//                    query11.bindValue(1,query9.value(2).toInt());
//                    query11.exec();
//                    query11.prepare("DELETE FROM tfx_wertungen_x_disziplinen WHERE int_wertungen_x_disziplinenid=?");
//                    query11.bindValue(0,query9.value(0).toInt());
//                    query11.exec();
//                }
//            }
//            QSqlQuery query12;
//            query12.prepare("DELETE FROM tfx_wertungen_details WHERE int_wertungenid=? AND int_disziplinenid NOT IN (SELECT int_disziplinenid FROM tfx_wertungen_x_disziplinen WHERE int_wertungenid=?)");
//            query12.bindValue(0,editid);
//            query12.bindValue(1,editid);
//            query12.exec();
//        } else {
//            QSqlQuery query11;
//            query11.prepare("DELETE FROM tfx_wertungen_x_disziplinen WHERE int_wertungen_x_disziplinenid=?");
//            query11.bindValue(0,editid);
//            query11.exec();
//        }
//
//    }
//
//    done(1);
}

void IndividualDialog::updateAthleteInfo() {
    auto userInput = ui->cmb_name->currentText();

    qDebug() << "IndividualDialog::updateAthleteInfo() with " << userInput;

    auto idx = userInput.isEmpty() ? -1 : ui->cmb_name->findText(userInput, Qt::MatchContains);
    auto pAthlete = qvariant_cast< Athlete* >(ui->cmb_name->itemData(idx, TF::ObjectRole));

    auto birthDate = pAthlete ? pAthlete->dateOfBirth() : QDate();
    auto showYearOnly = pAthlete ? pAthlete->yearOfBirthOnly() : false;
    auto gender = pAthlete ? pAthlete->gender() : -1;
    auto club = pAthlete ? ui->cmb_club->findData(pAthlete->clubId(), TF::IdRole) : -1;
    auto license = pAthlete ? pAthlete->license() : "0";

    ui->dae_year->setDate( birthDate );
    ui->chk_dat->setChecked( !showYearOnly );
    ui->cmb_sex->setCurrentIndex( gender );
    ui->cmb_club->setCurrentIndex( club );
    ui->txt_id->setText( license );
}

void IndividualDialog::checkJg() {
    qDebug() << "IndividualDialog::checkJg()";

    ui->lbl_control->setStyleSheet("");
    ui->lbl_control->setText("");

    const auto birthDate = ui->dae_year->date();

    if( !birthDate.isValid()){
        return;
    }

    auto pCompetition = qvariant_cast< Competition* >( ui->cmb_wk->currentData());

    if( !pCompetition ){
        return;
    }

    bool bOk = true;

    switch( pCompetition->maxYear() ) {
    case 1: // minYear "und alter"
        bOk = birthDate.year() <= pCompetition->minYear();
        break;
    case 2: // minYear "und junger"
        bOk = birthDate.year() >= pCompetition->minYear();
        break;
    case 3: // jahrgangsoffen
        bOk = true;
        break;
    default: // from minYear to maxYear
        bOk = ( pCompetition->minYear() <= birthDate.year() ) && ( birthDate.year() <= pCompetition->maxYear());
        break;
    }

    ui->lbl_control->setStyleSheet( bOk ? "" : "QLabel { background-color: red }\nQLabel { color: white }" );
    ui->lbl_control->setText( bOk ? "" : "Jahrgangsüberprüfung fehlgeschlagen!" );
}

void IndividualDialog::updateDisciplins() {
    qDebug() << "... IndividualDialog::updateDisciplins()";

//    ui->lst_dis->clear();
//    QSqlQuery query;
//    query.prepare("SELECT int_disziplinenid, var_name FROM tfx_disziplinen INNER JOIN tfx_wettkaempfe_x_disziplinen USING (int_disziplinenid) WHERE int_wettkaempfeid=? ORDER BY int_sportid, int_disziplinenid");
//    query.bindValue(0, ui->cmb_wk->itemData(ui->cmb_wk->currentIndex()));
//    query.exec();
//    while (query.next()) {
//        QListWidgetItem *item = new QListWidgetItem();
//        item->setData(Qt::UserRole,query.value(0).toInt());
//        item->setText(query.value(1).toString());
//        item->setFlags(item->flags() | Qt::ItemIsUserCheckable);
//        item->setCheckState(Qt::Checked);
//        ui->lst_dis->addItem(item);
//    }
//    query.prepare("SELECT bol_wahlwettkampf FROM tfx_wettkaempfe WHERE int_wettkaempfeid=?");
//    query.bindValue(0, ui->cmb_wk->itemData(ui->cmb_wk->currentIndex()));
//    query.exec();
//    query.next();
//    ui->act_dis->setEnabled(query.value(0).toBool());
//    if (editid != 0) {
//        for (int i=0;i<ui->lst_dis->count();i++) {
//            ui->lst_dis->item(i)->setCheckState(Qt::Unchecked);
//        }
//        QSqlQuery query2;
//        query2.prepare("SELECT int_disziplinenid FROM tfx_wertungen_x_disziplinen WHERE int_wertungenid=?");
//        query2.bindValue(0,editid);
//        query2.exec();
//        if (_global::querySize(query2) > 0) {
//            while (query2.next()) {
//                for (int i=0;i<ui->lst_dis->count();i++) {
//                    if (ui->lst_dis->item(i)->data(Qt::UserRole).toInt() == query2.value(0).toInt()) {
//                        ui->lst_dis->item(i)->setCheckState(Qt::Checked);
//                        break;
//                    }
//                }
//            }
//        } else {
//            for (int i=0;i<ui->lst_dis->count();i++) {
//                ui->lst_dis->item(i)->setCheckState(Qt::Checked);
//            }
//        }
//    }
}

void IndividualDialog::addClub() {
    //TODO reenable
    //ClubDialog *pe = new ClubDialog(0, this);
    //if(pe->exec() == 1) { updateClubs(); }
}
