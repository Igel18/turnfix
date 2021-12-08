//#include "participantstablemodel.h"
//#include "model/entity/event.h"
//#include "model/entitymanager.h"
//#include "src/global/header/_global.h"
//#include <QSqlQuery>

//ParticipantsTableModel::ParticipantsTableModel(Event *event, EntityManager *em, QObject *parent /*= nullptr*/)
//    : QSqlQueryModel(parent), m_event(event), m_em(em)
//{
//}

//void ParticipantsTableModel::updateType(Type type)
//{
//    m_type = type;
//    loadData();
//}

//void ParticipantsTableModel::loadData()
//{
//    QSqlDatabase db = QSqlDatabase::database(m_em->connectionName());
//    QSqlQuery query(db);
//    if (m_type == Individual) {
//        query.prepare("SELECT tfx_wertungen.int_startnummer, tfx_teilnehmer.var_nachname || ', ' || tfx_teilnehmer.var_vorname || CASE WHEN tfx_wertungen.bol_ak THEN ' (AK)' ELSE '' END, "+_global::date("dat_geburtstag",2)+", CASE WHEN tfx_teilnehmer.int_geschlecht=0 THEN 'w' ELSE 'm' END, tfx_vereine.var_name, tfx_wettkaempfe.var_nummer, tfx_wertungen.var_riege, tfx_wertungen.int_wertungenid FROM tfx_wertungen INNER JOIN tfx_teilnehmer USING (int_teilnehmerid) INNER JOIN tfx_vereine USING (int_vereineid) INNER JOIN tfx_wettkaempfe ON tfx_wettkaempfe.int_wettkaempfeid = tfx_wertungen.int_wettkaempfeid WHERE tfx_wettkaempfe.int_veranstaltungenid=? AND int_runde=? AND tfx_wertungen.int_gruppenid IS NULL AND tfx_wertungen.int_mannschaftenid IS NULL ORDER BY tfx_wettkaempfe.var_nummer, "+_global::substring("tfx_vereine.var_name","int_start_ort+1")+", tfx_vereine.var_name, tfx_teilnehmer.var_nachname, tfx_teilnehmer.var_vorname");
//        query.bindValue(0, m_event->mainEvent()->id());
//        query.bindValue(1, m_event->round());
//    } else if (m_type == Team) {
//        query.prepare("SELECT tfx_mannschaften.int_startnummer, tfx_vereine.var_name, tfx_mannschaften.int_nummer || '. Mannschaft', tfx_wettkaempfe.var_nummer, tfx_mannschaften.var_riege, tfx_mannschaften.int_mannschaftenid FROM tfx_mannschaften INNER JOIN tfx_vereine USING (int_vereineid) INNER JOIN tfx_wettkaempfe ON tfx_wettkaempfe.int_wettkaempfeid = tfx_mannschaften.int_wettkaempfeid WHERE tfx_wettkaempfe.int_veranstaltungenid=? ORDER BY tfx_wettkaempfe.var_nummer, "+_global::substring("tfx_vereine.var_name","int_start_ort+1")+", tfx_vereine.var_name, tfx_mannschaften.int_nummer");
//        query.bindValue(0, m_event->mainEvent()->id());
//    } else if (m_type == Group) {
//        query.prepare("SELECT tfx_wertungen.int_startnummer, tfx_gruppen.var_name, tfx_vereine.var_name, tfx_wettkaempfe.var_nummer, tfx_wertungen.var_riege, tfx_gruppen.int_gruppenid FROM tfx_wertungen INNER JOIN tfx_gruppen USING (int_gruppenid) INNER JOIN tfx_vereine USING (int_vereineid) INNER JOIN tfx_wettkaempfe ON tfx_wettkaempfe.int_wettkaempfeid = tfx_wertungen.int_wettkaempfeid WHERE tfx_wettkaempfe.int_veranstaltungenid=? AND int_runde=? ORDER BY tfx_wettkaempfe.var_nummer, "+_global::substring("tfx_vereine.var_name","int_start_ort+1")+", tfx_vereine.var_name, tfx_gruppen.var_name");
//        query.bindValue(0, m_event->mainEvent()->id());
//        query.bindValue(1, m_event->round());
//    }

//    query.exec();

//    setQuery(query);
//}

//int ParticipantsTableModel::columnCount([[maybe_unused]] const QModelIndex& parent) const
//{
//    if (m_type == Individual) {
//        return 7;
//    }
//    return 5;
//}

//QVariant ParticipantsTableModel::headerData(int section, Qt::Orientation orientation, int role) const
//{
//    QString headersIndividual[7] = {"StNr.", "Name", "Geb.", "m/w", "Verein", "WK", "Riege"};
//    QString headersTeam[5] = {"StNr.", "Verein", "Mannschaft", "WK", "Riege"};
//    QString headersGroup[5] = {"StNr.", "Gruppe", "Verein", "WK", "Riege"};

//    if (role == Qt::DisplayRole && orientation == Qt::Horizontal)
//    {
//        switch (m_type) {
//        case Individual:
//            return headersIndividual[section];
//        case Team:
//            return headersTeam[section];
//        case Group:
//            return headersGroup[section];
//        }
//    }
//    return QVariant();
//}
