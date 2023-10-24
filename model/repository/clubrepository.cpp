#include "clubrepository.h"
#include "model/entity/person.h"
#include "model/entitymanager.h"
#include "model/entity/event.h"
//#include "model/querybuilder.h"
//#include <QSqlQuery>

//Returns all clubs for the selected event - not working yet
QList< Club* > ClubRepository::fetchByEvent(Event *event, int* id /*= nullptr*/ )
{
    QSqlDatabase db = QSqlDatabase::database(entityManager()->connectionName());
    QList<Club *> output;
    QSqlQuery query(db);
    query.prepare("SELECT tfx_vereine.int_vereineid FROM tfx_wertungen INNER JOIN tfx_wettkaempfe USING (int_wettkaempfeid) LEFT JOIN tfx_teilnehmer ON tfx_teilnehmer.int_teilnehmerid = tfx_wertungen.int_teilnehmerid LEFT JOIN tfx_gruppen ON tfx_gruppen.int_gruppenid = tfx_wertungen.int_gruppenid LEFT JOIN tfx_mannschaften ON tfx_mannschaften.int_mannschaftenid = tfx_wertungen.int_mannschaftenid INNER JOIN tfx_vereine ON tfx_vereine.int_vereineid = tfx_teilnehmer.int_vereineid OR tfx_vereine.int_vereineid = tfx_gruppen.int_vereineid OR tfx_vereine.int_vereineid = tfx_mannschaften.int_vereineid WHERE int_veranstaltungenid=? GROUP BY tfx_vereine.int_vereineid, tfx_vereine.var_name, tfx_vereine.int_start_ort, tfx_gruppen.int_gruppenid ORDER BY  tfx_vereine.var_name");
    query.bindValue( 0, event->mainEvent()->id() );
    query.exec();

    while (query.next()) {
        auto club = new Club();
        const QMetaObject *metaObj = club->metaObject();
        const DBTable *mappingObj = Club::mapping();

        for (int i = metaObj->propertyOffset(); i < metaObj->propertyCount(); ++i) {
            QMetaProperty property = metaObj->property(i);
            DBColumn *column = mappingObj->columnByProperty(property.name());

           if (column != nullptr)
            {
                club->setProperty(property.name(), query.value(column->name()));
            }
        }

        output.append(club);
    }

    return output;
}

QList< Club* > ClubRepository::fetchByEvent2(Event *event, int* id /*= nullptr*/ )
{
    QSqlDatabase db = QSqlDatabase::database(entityManager()->connectionName());
    QList<Club *> output;
    QSqlQuery query(db);
    query.prepare("SELECT tfx_vereine.int_vereineid, tfx_vereine.var_name FROM tfx_wertungen INNER JOIN tfx_wettkaempfe USING (int_wettkaempfeid) LEFT JOIN tfx_teilnehmer ON tfx_teilnehmer.int_teilnehmerid = tfx_wertungen.int_teilnehmerid LEFT JOIN tfx_gruppen ON tfx_gruppen.int_gruppenid = tfx_wertungen.int_gruppenid INNER JOIN tfx_vereine ON tfx_vereine.int_vereineid = tfx_teilnehmer.int_vereineid OR tfx_vereine.int_vereineid = tfx_gruppen.int_vereineid WHERE int_veranstaltungenid=? GROUP BY tfx_vereine.int_vereineid, tfx_vereine.var_name, tfx_vereine.int_start_ort, tfx_gruppen.int_gruppenid ORDER BY tfx_vereine.var_name");
    query.bindValue( 0, event->mainEvent()->id() );
    query.exec();

    while (query.next()) {
        auto club = new Club();
        const QMetaObject *metaObj = club->metaObject();
        const DBTable *mappingObj = Club::mapping();

        for (int i = metaObj->propertyOffset(); i < metaObj->propertyCount(); ++i) {
            QMetaProperty property = metaObj->property(i);
            DBColumn *column = mappingObj->columnByProperty(property.name());

           if (column != nullptr)
            {
                club->setProperty(property.name(), query.value(column->name()));
            }
        }

        output.append(club);
    }

    return output;
}


// Returns all clubs from the database as list
QList< Club* > ClubRepository::fetch( int* id /*= nullptr*/ )
{
    QueryBuilder<Club> qb;
    qb.select(Club::staticMetaObject, Club::mapping());
    qb.join(Person::staticMetaObject, Person::mapping(), "Club", "contactPerson", "contactPersonId");

    if( id ){
        qb.where("Club", "id", *id );
    }

    qb.orderBy("Club", "name");

    QList<Club *> output = qb.query( QSqlDatabase::database( entityManager()->connectionName() ) );

    return output;
}
