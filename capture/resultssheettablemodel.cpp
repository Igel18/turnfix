#include "resultssheettablemodel.h"
#include "libs/fparser/fparser.hh"
#include "model/entitymanager.h"
#include "model/entity/club.h"
#include "model/entity/event.h"
#include "model/entity/score.h"
#include "model/entity/startingorder.h"
#include "model/repository/disciplinerepository.h"
#include "model/repository/competitionrepository.h"
#include "model/repository/competitiondisciplinerepository.h"
#include "model/repository/clubrepository.h"
#include "model/repository/disciplinefieldrepository.h"
#include "model/repository/juryscorerepository.h"
#include "model/repository/scorerepository.h"
#include "model/repository/scoredetailsrepository.h"
#include "model/repository/scoredisciplinerepository.h"
#include "model/repository/startingorderrepository.h"
#include "src/global/header/_global.h"
#include <math.h>
#include <QColor>
#include <QKeyEvent>

ResultsSheetTableModel::ResultsSheetTableModel(EntityManager* em, Event *event, QObject *parent)
    : QAbstractTableModel(parent), m_em(em), m_event(event)
{
}

int ResultsSheetTableModel::rowCount(const QModelIndex &) const
{
    return starter.size() * versuche;
}

int ResultsSheetTableModel::columnCount(const QModelIndex &) const
{
    return 5 + extraColumns.size();
}

QVariant ResultsSheetTableModel::data(const QModelIndex &index, int role) const
{
    if( !index.isValid() || ( index.row() >= starter.size() * versuche ) || ( starter.size() <= 0 ) ){
        return QVariant();
    }

    int row = static_cast< int >( floor( index.row() / versuche ) );

    if( role == Qt::DisplayRole ) {
        if (index.column() < 4) {
            return starter.at(row).at(index.column());
        } else {
            double wert = 0;
            int scoreId = starter.at( row ).at( 4 ).toInt();
            int attempt = (index.row() % versuche ) + 1;
            if( index.column() == columnCount() - 1 ) {
                wert = endwerte.value( scoreId ).value( attempt );
            } else {
                wert = detailwerte.value( scoreId ).value( attempt ).value( extraColumns.at( index.column() - 4 ) );
            }

            return _global::strLeistung( wert, m_pDisciplineInfo->unit(), m_pDisciplineInfo->inputMask(), m_pDisciplineInfo->decimals() );
        }
    } else if ( role == Qt::BackgroundColorRole && ( index.column() == columnCount() - 1 ) ) {

        auto items = m_em->competitionDisciplineRepository()->load( m_event->id(), starter.at(row).at( 3 ), geraet );

        if( items.count() == 1 ){
            auto pCompetitionDiscipline = items.at( 0 );
            auto dMaxScore = pCompetitionDiscipline->maximumScore();
            auto sResultFormula = pCompetitionDiscipline->discipline()->resultFormula();
            int scoreId = starter.at( row ).at( 4 ).toInt();
            int attempt = (index.row() % versuche ) + 1;

            FunctionParser fparser;
            fparser.Parse( sResultFormula.replace( ",", "." ).toStdString(), "x" );
            double Vars[] = { endwerte.value( scoreId ).value( attempt ) };
            auto ranking = fparser.Eval( Vars );
            if( ( ranking > dMaxScore ) && ( dMaxScore > 0 ) ) {
                return QColor(Qt::red);
            }
        }
    }

    return QVariant();
}

QVariant ResultsSheetTableModel::headerData(int section, Qt::Orientation orientation, int role) const
{
    if( ( role == Qt::DisplayRole ) && ( orientation == Qt::Horizontal ) ) {
        switch (section) {
        case 0: return "StNr.";
        case 1: return "Name";
        case 2: return "Verein";
        case 3: return "WK";
        }

        if( geraet > 0 ){
            if( section == columnCount() - 1 ){
                if ( m_pDisciplineInfo ){
                    return m_pDisciplineInfo->shortName1();
                }
            } else {
                return extraColumnNames.at( section - 4 );
            }
        }
    }

    return QVariant();
}

Qt::ItemFlags ResultsSheetTableModel::flags(const QModelIndex &index) const
{
    if (!index.isValid())
        return Qt::ItemIsEnabled;
    if (index.column() > 3) {
        return Qt::ItemIsSelectable | Qt::ItemIsEnabled | Qt::ItemIsEditable;
    }
    return Qt::ItemIsEnabled | Qt::ItemIsSelectable;
}

bool ResultsSheetTableModel::setData(const QModelIndex &index, const QVariant &value, int role)
{
    if (index.isValid() && role == Qt::EditRole) {
        int row = static_cast< int >( floor( index.row() / versuche ) );

        int iScoreId = starter.at( row ).at( 4 ).toInt(); // aka participant id
        int iAttempt = ( index.row() % versuche ) + 1;
        int kp = kuer ? 1 : 0;
        double leistung = _global::calcLeistung( value.toString() );

        if( index.column() == columnCount() - 1 ) {

            auto detailsRepo = m_em->scoreDetailsRepository();
            auto scoreDetails = detailsRepo->fetch( &iScoreId, &geraet, &iAttempt, nullptr, &kp );

            if( ( m_pDisciplineInfo->inputMask() == value ) || ( leistung == 0 ) ) {
                for( auto it = scoreDetails.begin(); it != scoreDetails.end(); ++it ){
                    detailsRepo->remove( *it );
                }

                auto juryScoreRepo = m_em->juryScoreRepository();
                auto juryScoreItemsToDel = juryScoreRepo->fetch( &iScoreId, &geraet, &iAttempt, nullptr, &kp );
                bool bEnabled = true;
                auto disciplineFields = m_em->disciplineFieldRepository()->loadByDisciplineId( geraet, &bEnabled );

                for(auto it = juryScoreItemsToDel.begin(); it != juryScoreItemsToDel.end(); ++it){
                    auto pJuryScore = *it;
                    auto itFound = std::find_if(disciplineFields.begin(), disciplineFields.end(), [ pJuryScore ]( DisciplineField* pItem){
                        return pItem->id() == pJuryScore->disciplineFieldId();
                    });

                    if( itFound != disciplineFields.end() ){
                        juryScoreRepo->remove( pJuryScore );
                    }
                }
            } else {
                ScoreDetails* pScoreDetailsItem = scoreDetails.count() > 0 ? scoreDetails.at( 0 ) : new ScoreDetails();
                pScoreDetailsItem->setScoreId( iScoreId );
                pScoreDetailsItem->setDisciplineId( geraet );
                pScoreDetailsItem->setAttempt( iAttempt );
                pScoreDetailsItem->setPerformance( leistung );
                pScoreDetailsItem->setType( kp );
                detailsRepo->persist( pScoreDetailsItem );
            }

            endwerte[ iScoreId ][ iAttempt ] = leistung;

        } else {
            int iExtraFieldId = extraColumns.at( index.column() - 4 );
            auto pJuryRepo = m_em->juryScoreRepository();
            auto items = pJuryRepo->fetch( &iScoreId, &iExtraFieldId, &iAttempt, nullptr, &kp );

            if( leistung > 0 ){
                auto pJuryScore = items.isEmpty() ? new JuryScore() : items.at( 0 );
                pJuryScore->setScoreId( iScoreId );
                pJuryScore->setDisciplineFieldId( iExtraFieldId );
                pJuryScore->setAttempt( iAttempt );
                pJuryScore->setPerformance( leistung );
                pJuryScore->setType( kp );
                pJuryRepo->persist( pJuryScore );
            } else {
                for( auto it = items.begin(); it != items.end(); ++it ){
                    pJuryRepo->remove( *it );
                }
            }

            detailwerte[ iScoreId ][ iAttempt ][ iExtraFieldId ] = leistung;
        }

        emit dataChanged( index, index );

        return true;
    }

    return false;
}

void ResultsSheetTableModel::setTableData( QString squad, int g, int v, bool k, bool jury)
{
    beginResetModel();

    m_pParticipants.clear();

    riege = squad;
    geraet = g; // disciplineId
    kuer = k;
    versuche = v; // attempt

    QList< Score* > participants;

    // auto pClubRepo = m_em->clubRepository();
    auto pScoreDetailsRepo = m_em->scoreDetailsRepository();
    auto pScoreDisciplineRepo = m_em->scoreDisciplineRepository();
    auto pScoreRepo = m_em->scoreRepository();
    auto pCompetitionDisciplineRepo = m_em->competitionDisciplineRepository();

    // fetch competitions for the event
    const auto competitions = m_em->competitionRepository()->fetchByEvent( m_event );

    // fetch participants for the competitions
    for( auto& competition : competitions ){
        int competitionId = competition->id();
        participants.append( pScoreRepo->fetch( &competitionId ) );
    }

    // filter particular paticipants for the model
    for( auto& participant : participants ){
        // 1. check club
        if( participant->athlete() && !participant->athlete()->club() ){
            continue; // skip participants not club members
        }

        if( participant->group() && !participant->group()->club() ){
            continue; // skip participants not club members
        }

        // 2. check squad, round, dns
        if( ( participant->squad() != riege ) || ( participant->round() != m_event->round() ) || participant->dns() ){
            continue; // skip not from target squad, different round or dns
        }

        // 3. check competition disciplines
        auto competitionDisciplines = pCompetitionDisciplineRepo->fetchByCompetition( participant->competition(), &geraet );
        if( competitionDisciplines.isEmpty() ){
            continue; // discipline was not selected for the competition
        }

        int iScoreId = participant->id();
        // 4. check participant disciplines
        auto scoreAllDisciplineItems = pScoreDisciplineRepo->fetch( &iScoreId );
        auto scoreTargetDisciplineItems = pScoreDisciplineRepo->fetch( &iScoreId, &geraet );
        bool takePart = scoreAllDisciplineItems.isEmpty() || !scoreTargetDisciplineItems.isEmpty();

        if( !takePart ){
            continue; // skip not relevant disciplines
        }

        // 5. check KP
        bool relevantKP = !kuer || participant->competition()->freeAndCompulsary() || competitionDisciplines.at( 0 )->freeAndCompulsary();
        if( !relevantKP ){
            continue;
        }

        m_pParticipants.append( participant );
    }

    // get starting order
    QMultiMap< int, Score* > participantPos;

    int kp_type = kuer ? 1 : 0;
    auto pStartingOrderRepo = m_em->startingOrderRepository();

    for( auto& participant : m_pParticipants ){
        int scoreId = participant->id();
        auto startingOrders = pStartingOrderRepo->fetch( &scoreId, &geraet, &kp_type );
        int pos = startingOrders.isEmpty() ? 0 : startingOrders.at( 0 )->position();
        participantPos.insert( pos, participant);
    }

    starter.clear();
    extraColumns.clear();
    extraColumnNames.clear();
    endwerte.clear();

    for( auto& participant : m_pParticipants ){
        QStringList slItems;

        slItems << QString("%1").arg(participant->bib());
        slItems << participant->athlete()->fullName();
        slItems << participant->athlete()->club()->name();
        slItems << participant->competition()->number();
        slItems << QString("%1").arg(participant->id());
        slItems << QString("%1").arg(participant->competitionId());

        starter.append( slItems );

        int kp = kuer ? 1 : 0;

        int scoreId = participant->id();
        auto scoreDetails = pScoreDetailsRepo->fetch( &scoreId, &geraet, nullptr, nullptr, &kp );

        for( auto it = scoreDetails.begin(); it != scoreDetails.end(); ++it ){
            auto pDetails = *it;
            endwerte[ pDetails->scoreId() ][pDetails->attempt()] = pDetails->performance();
        }
    }

    if ( jury ) {
        auto disciplineFields = m_em->disciplineFieldRepository()->loadByDisciplineId( geraet );

        std::sort(disciplineFields.begin(), disciplineFields.end(), [](const DisciplineField* pLhs, const DisciplineField* pRhs){
            return pLhs->sort() < pRhs->sort();
        });

        for( auto& field : disciplineFields ){
            if( field->enabled() && !field->finalScore() ){
                extraColumns.append( field->id() );
                extraColumnNames.append( field->name() );
            }
        }
    }

    m_pDisciplineInfo = m_em->disciplineRepository()->loadDiscipline( geraet );

//    QSqlQuery query4;
//    query4.prepare("SELECT tfx_wertungen.int_startnummer, CASE WHEN tfx_gruppen.int_gruppenid IS NULL THEN var_vorname || ' ' || var_nachname ELSE tfx_gruppen.var_name END, tfx_vereine.var_name, tfx_wettkaempfe.var_nummer, tfx_wertungen.int_wertungenid, tfx_wertungen.int_wettkaempfeid, int_pos FROM tfx_wertungen INNER JOIN tfx_wettkaempfe USING (int_wettkaempfeid) LEFT JOIN tfx_teilnehmer ON tfx_teilnehmer.int_teilnehmerid = tfx_wertungen.int_teilnehmerid LEFT JOIN tfx_gruppen ON tfx_gruppen.int_gruppenid = tfx_wertungen.int_gruppenid LEFT JOIN tfx_mannschaften ON tfx_mannschaften.int_mannschaftenid = tfx_wertungen.int_mannschaftenid INNER JOIN tfx_vereine ON tfx_vereine.int_vereineid = tfx_teilnehmer.int_vereineid OR tfx_vereine.int_vereineid = tfx_gruppen.int_vereineid LEFT JOIN tfx_startreihenfolge ON tfx_startreihenfolge.int_wertungenid=tfx_wertungen.int_wertungenid AND tfx_startreihenfolge.int_disziplinenid=? AND tfx_startreihenfolge.int_kp=? WHERE int_veranstaltungenid=? AND tfx_wertungen.var_riege=? AND int_runde=? AND bol_startet_nicht='false' AND ((SELECT COUNT(*) FROM tfx_wettkaempfe_x_disziplinen WHERE int_disziplinenid=? AND int_wettkaempfeid=tfx_wettkaempfe.int_wettkaempfeid)>0 AND (NOT EXISTS (SELECT int_wertungen_x_disziplinenid FROM tfx_wertungen_x_disziplinen WHERE int_wertungenid=tfx_wertungen.int_wertungenid) OR EXISTS (SELECT int_wertungen_x_disziplinenid FROM tfx_wertungen_x_disziplinen WHERE tfx_wertungen_x_disziplinen.int_wertungenid=tfx_wertungen.int_wertungenid AND tfx_wertungen_x_disziplinen.int_disziplinenid=?))) AND (tfx_wettkaempfe.bol_kp='true' OR ?='true' OR (SELECT bol_kp FROM tfx_wettkaempfe_x_disziplinen WHERE int_wettkaempfeid=tfx_wettkaempfe.int_wettkaempfeid AND int_disziplinenid=?)='true') ORDER BY int_pos, tfx_wettkaempfe.var_nummer, tfx_mannschaften.int_nummer, tfx_mannschaften.int_mannschaftenid, tfx_wertungen.int_startnummer");
//    query4.bindValue(0, geraet);
//    query4.bindValue(1, static_cast<int>(kuer));
//    query4.bindValue(2, this->m_event->mainEvent()->id());
//    query4.bindValue(3, riege);
//    query4.bindValue(4, m_event->round());
//    query4.bindValue(5, geraet);
//    query4.bindValue(6, geraet);
//    query4.bindValue(7, !kuer);
//    query4.bindValue(8, geraet);
//    query4.exec();

//    starter.clear();
//    if (_global::querySize(query4)>0)  {
//        bool skip=false;
//        query4.last();
//        if (query4.value(6).toInt()>0) skip = true;
//        query4.first();
//        if (query4.value(6).toInt()>0) skip = true;
//        query4.seek(-1);
//        while (query4.next()) {
//            if (query4.value(6).toInt()==0 && skip) continue;
//            QStringList lst;
//            for (int i=0;i<query4.record().count()-1;i++) {
//                lst << query4.value(i).toString();
//            }
//            starter.append(lst);
//        }
//    }

//    extraColumns.clear();
//    extraColumnNames.clear();
//    if (j) {
//        QSqlQuery juryFields;
//        juryFields.prepare("SELECT int_disziplinen_felderid, tfx_disziplinen_felder.var_name FROM tfx_disziplinen_felder INNER JOIN tfx_disziplinen USING (int_disziplinenid) WHERE int_disziplinenid=? AND bol_endwert = 'false' AND bol_enabled='true' ORDER BY int_sortierung");
//        juryFields.bindValue(0,geraet);
//        juryFields.exec();
//        while(juryFields.next()) {
//            extraColumns.append(juryFields.value(0).toInt());
//            extraColumnNames.append(juryFields.value(1).toString());
//        }
//    }

//    disinfo.prepare("SELECT var_einheit, var_maske, int_berechnung, var_kurz1 FROM tfx_disziplinen WHERE int_disziplinenid=?");
//    disinfo.bindValue(0,geraet);
//    disinfo.exec();
//    disinfo.next();

//                    int kp = kuer ? 1 : 0;
//                    endwerte.clear();
//                    QSqlQuery endwerteQuery;
//                    endwerteQuery.prepare("SELECT rel_leistung, int_wertungenid, int_versuch FROM tfx_wertungen_details INNER JOIN tfx_wertungen USING (int_wertungenid) INNER JOIN tfx_wettkaempfe USING (int_wettkaempfeid) WHERE int_veranstaltungenid=? AND int_disziplinenid=? AND var_riege=? AND int_kp=?");
//                    endwerteQuery.bindValue(0, this->m_event->mainEvent()->id());
//                    endwerteQuery.bindValue(1,geraet);
//                    endwerteQuery.bindValue(2,riege);
//                    endwerteQuery.bindValue(3,kp);
//                    endwerteQuery.exec();
//                    while (endwerteQuery.next()) {
//                        endwerte[endwerteQuery.value(1).toInt()][endwerteQuery.value(2).toInt()] = endwerteQuery.value(0).toDouble();
//                    }

//    detailwerte.clear();
//    if (j) {
//        QSqlQuery detailwerteQuery;
//        detailwerteQuery.prepare("SELECT rel_leistung, int_disziplinen_felderid, tfx_wertungen.int_wertungenid, int_versuch FROM tfx_jury_results INNER JOIN tfx_disziplinen_felder USING (int_disziplinen_felderid) INNER JOIN tfx_wertungen ON tfx_jury_results.int_wertungenid = tfx_wertungen.int_wertungenid INNER JOIN tfx_wettkaempfe USING (int_wettkaempfeid) WHERE int_veranstaltungenid=? AND int_disziplinenid=? AND var_riege=? AND int_kp=? AND bol_enabled='true'");
//        detailwerteQuery.bindValue(0, this->m_event->mainEvent()->id());
//        detailwerteQuery.bindValue(1,geraet);
//        detailwerteQuery.bindValue(2,riege);
//        detailwerteQuery.bindValue(3,kp);
//        detailwerteQuery.exec();
//        while (detailwerteQuery.next()) {
//            detailwerte[detailwerteQuery.value(2).toInt()][detailwerteQuery.value(3).toInt()][detailwerteQuery.value(1).toInt()] = detailwerteQuery.value(0).toDouble();
//        }
//    }

    endResetModel();
}

QList<int> ResultsSheetTableModel::getExtraColumnIDs()
{
    return extraColumns;
}

int ResultsSheetTableModel::getCurrentID(const QModelIndex &index)
{
    return starter.at(static_cast<int>(floor(index.row()/versuche))).at(4).toInt();
}

int ResultsSheetTableModel::getNextID(const QModelIndex &index)
{
    if (floor((index.row()+versuche)/versuche) >= starter.size()) return -1;
    return starter.at(static_cast<int>(floor((index.row()+versuche)/versuche))).at(4).toInt();
}

int ResultsSheetTableModel::getLastID(const QModelIndex &index)
{
    if (index.row()-versuche < 0) return -1;
    return starter.at(static_cast<int>(floor((index.row()-versuche)/versuche))).at(4).toInt();
}
