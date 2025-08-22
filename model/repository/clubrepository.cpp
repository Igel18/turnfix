#include "clubrepository.h"
#include "model/entity/person.h"
#include "model/entitymanager.h"
#include "model/entity/score.h"

/*
 * Returns all clubs from the database table tfx_vereine as list
 */
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

QList<Club*> ClubRepository::fetchClubByEvent(Event* event, const int* id /*= nullptr*/)
{
    QueryBuilder<Score> qb;
    qb.select(Score::staticMetaObject, Score::mapping());
    qb.join(Athlete::staticMetaObject, Athlete::mapping(), "Score", "athlete", "athleteId");
    qb.join(Club::staticMetaObject, Club::mapping(), "Athlete", "club", "clubId");
    qb.join(Competition::staticMetaObject, Competition::mapping(), "Score", "competition", "competitionId");

    // Filter nach Event-ID
   // qb.where("Competition", "eventId", event->id());

    qb.where( "Score", "competitionId", 674 );

    // Optionaler Filter nach Club-ID
    if (id) {
    //    qb.where("Club", "id", *id);
    }

    QList< Score *> output = qb.query( QSqlDatabase::database( entityManager()->connectionName() ) );
    qDebug() << output;

    QList<Club*> tmp;

    return tmp;
//    QueryBuilder<Club> qb;
//    qb.select(Club::staticMetaObject, Club::mapping());
//    qb.join(Score::staticMetaObject, Score::mapping(), "Club", "score", "clubId");
//    qb.join(Competition::staticMetaObject, Competition::mapping(), "Score", "competition", "competitionId");

//    // Filter nach Event-ID
//    qb.where("Competition", "eventId", event->id());

//    // Optionaler Filter nach Club-ID
//    if (id) {
//        qb.where("Club", "id", *id);
//    }

//    qb.orderBy("Club", "name");

//    // Abfrage ausführen und Ergebnisse zurückgeben
//    return qb.query(QSqlDatabase::database(entityManager()->connectionName()));
}

