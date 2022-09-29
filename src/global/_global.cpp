#include "header/_global.h"
#include "header/settings.h"
#include "model/entity/event.h"
#include "model/repository/competitionrepository.h"
#include "model/repository/competitiondisciplinerepository.h"
#include "model/repository/scorerepository.h"
#include "model/repository/squaddisciplinerepository.h"
#include "model/settings/session.h"

int _global::dbtyp = 0;

QStringList _global::fields = QStringList();

void _global::initFields() {

    QStringList f;
    f <<  "Veranstaltungsname" << "Veranstaltungsdatum" << "Veranstaltungsort"
            << "Name" << "Verein" << "Platz" << "Punkte"
            << "Wettkampfbezeichnung" << "Wettkampfbezeichnung mit Jahrgang"
            << "Turnkreis/-gau" << "Verband" << "Land" << "Ausdruck-Typ" << "Summe Platzziffern"
            << "Mannschaftsnamen" << "Wettkampfnummer";

    fields = f;
}

void _global::setDBTyp(int typ) {
    dbtyp = typ;
}

int _global::getDBTyp() {
    return dbtyp;
}

QStringList _global::getFields() {
    return fields;
}

QString _global::wkBez(Event *event, QString swknr) {
    auto em = Session::getInstance()->getEntityManager();
    auto db = QSqlDatabase::database( em->connectionName() );

    QSqlQuery query( db );
    query.prepare("SELECT bol_ak_anzeigen, yer_von, yer_bis, dat_von FROM tfx_wettkaempfe INNER JOIN tfx_veranstaltungen USING (int_veranstaltungenid) WHERE int_veranstaltungenid=? AND var_nummer=? ORDER BY var_nummer LIMIT 1");
    query.bindValue(0, event->mainEvent()->id() );
    query.bindValue(1,swknr);
    query.exec();
    query.next();
    QString jahr1;
    QString jahr2;
    if (!query.value(0).toBool()) {
        jahr1 = "Jg. " + query.value(1).toString();
        jahr2 = query.value(2).toString();
    } else {
        jahr1 = "AK " + QString().setNum(query.value(3).toString().left(4).toInt()-query.value(1).toInt());
        jahr2 = QString().setNum(query.value(3).toString().left(4).toInt()-query.value(2).toInt());
    }
    QString to;
    switch (query.value(2).toInt()) {
    case 1  : to = QString(" und älter"); break;
    case 2  : to = QString(" und jünger"); break;
    default : to = QString(" - " + jahr2);  break;
    }
    if (query.value(1).toString() == query.value(2).toString()) {
        to = "";
    }
    if (query.value(2).toInt() == 3) {
        jahr1 = "Jahrgangsoffen";
        to = "";
    }
    return " " + jahr1 + to;
}

void _global::updateRgDis(Event* event, EntityManager* em) {
    QMap< QString, QSet< int > > squadDisciplinesId;
    const int iRound = event->round();
    const auto competitions = em->competitionRepository()->fetchByEvent( event );

    for( auto& competition : competitions ){
        if( competition->round() != iRound ){
            continue;
        }

        int id = competition->id();

        const auto participants = em->scoreRepository()->fetch( &id, &iRound );
        const auto disciplines = em->competitionDisciplineRepository()->fetchByCompetition( competition );

        for( auto& participant : participants ){
            for( auto& discipline : disciplines ){
                if( !participant->squad().isEmpty() ){
                    squadDisciplinesId[ participant->squad() ].insert( discipline->disciplineId() );
                }
            }
        }
    }

    auto existing = em->squadDisciplineRepository()->load( event, QString(), nullptr, &iRound );
    auto squads = squadDisciplinesId.keys();

    // add new items
    for( auto& squadName : squads ){
        for( auto& disciplineId : squadDisciplinesId.value( squadName ) ){
            auto itFound = std::find_if( existing.begin(), existing.end(), [ squadName, disciplineId ]( SquadDiscipline* pItem ){
                    return ( pItem->squad() == squadName ) && ( pItem->disciplineId() == disciplineId ); } );
            if( itFound != existing.end() ){
                continue; // already exists
            }

            auto pItem = new SquadDiscipline();

            pItem->setEventId( event->id() );
            pItem->setDisciplineId( disciplineId );
            pItem->setStatusId( 1 ); // keine Status by default
            pItem->setSquad( squadName );
            pItem->setRound( event->round() );
            pItem->setStart( false );

            em->squadDisciplineRepository()->persist( pItem );
        }
    }

    // delete not relevant
    for( auto& item: existing ){
        if( !squadDisciplinesId.value( item->squad() ).contains( item->disciplineId() ) ){
            em->squadDisciplineRepository()->remove( item );
        }
    }
}

double _global::calcLeistung(QString val) {
    double leistung;
    if (val.contains(":")) {
        QStringList split = val.split(":");
        leistung = split.at(0).toDouble()*60 + split.at(1).toDouble();
    }
    else if (val.contains(",")) {
        leistung = val.replace(",", ".").toDouble();
    } else {
        leistung = val.toDouble();
    }
    return leistung;
}

QList<QVariant> _global::nameSplit(QString name) {
    QList<QVariant> names;
    if (name.contains(", ")) {
        names.append(name.split(", ").at(1));
        names.append(name.split(", ").at(0));
    } else {
        int space = name.indexOf(" ");
        names.append(name.left(space));
        names.append(name.right(name.length()-space-1));
    }
    return names;
}

QString _global::strLeistung(double lst, QString einheit, QString maske, int nk) {
    QString meldeleistung;
    if ((lst > 59.59 && einheit != "m") || maske == "00:00.00") {
        int minutes = (int)(lst / 60);
        double seconds = lst - (minutes*60);
        meldeleistung = QString("%1").arg(minutes,2,'f',0,'0') + QString(":") + QString("%1").arg(seconds,5,'f',nk,'0');
    } else {
        meldeleistung = QString("%1").arg(lst, maske.length(), 'f', nk, '0');
    }
    return meldeleistung;
}


QString _global::nameFormat() {
    switch (Settings::nameFormat) {
    case 0: return "tfx_teilnehmer.var_vorname || ' ' || tfx_teilnehmer.var_nachname";
    case 1: return "upper(tfx_teilnehmer.var_nachname) || ' ' || tfx_teilnehmer.var_vorname";
    case 2: return "tfx_teilnehmer.var_nachname || ', ' || tfx_teilnehmer.var_vorname";
    }
    return "tfx_teilnehmer.var_vorname || ' ' || tfx_teilnehmer.var_nachname";
}

QString _global::intListToString(QList<int> clubs) {
    if (clubs.size()==0) return "0";
    QString clubString;
    for (int i=0;i<clubs.size();i++) {
        clubString += QString::number(clubs.at(i));
        if (i<clubs.size()-1) clubString += ",";
    }
    return clubString;
}

QList<int> _global::splitColorArray(QString array) {
    QString brackets = array.left(array.length()-1).right(array.length()-2);
    QStringList colors = brackets.split(",");
    QList<int> colary;
    for (int i=0;i<colors.size();i++) {
        colary.append(colors.at(i).toInt());
    }
    return colary;
}

int _global::querySize(QSqlQuery query) {
    if (dbtyp == 1) {
        int i=0;
        query.exec();
        while (query.next()) {
            i++;
        }
        query.exec();
        return i;
    } else {
        return query.size();
    }
}

QString _global::substring(QString field, QString from) {
    if (_global::getDBTyp() == 0) {
        return "substring("+field+" from "+from+")";
    } else {
        return "substr("+field+","+from+")";
    }
}

QString _global::date(QString field, int length) {
    if (length == 2) {
        if (_global::getDBTyp() == 0) {
            return "to_char("+field+",'YY')";
        } else {
            return "substr(strftime('%Y', "+field+"),3,2)";
        }
    } else if (length == 10) {
        if (_global::getDBTyp() == 0) {
            return "to_char("+field+",'dd.mm.yyyy')";
        } else {
            return "strftime('%d.%m.%Y', "+field+")";
        }
    } else {
        if (_global::getDBTyp() == 0) {
            return "to_char("+field+",'YYYY')";
        } else {
            return "strftime('%Y', "+field+")";
        }
    }
}
