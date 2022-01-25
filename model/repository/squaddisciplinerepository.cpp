#include "squaddisciplinerepository.h"

#include "model/entity/discipline.h"
#include "model/entity/status.h"


QList< SquadDiscipline* > SquadDisciplineRepository::load( Event* pEvent,
                                                           QString squad /*= QString()*/,
                                                           const int* disciplineId /*= nullptr*/,
                                                           const int* round /*= nullptr*/ )
{
    QueryBuilder< SquadDiscipline > qb;
    qb.select( SquadDiscipline::staticMetaObject, SquadDiscipline::mapping() );
    qb.join( Discipline::staticMetaObject, Discipline::mapping(), "SquadDiscipline", "discipline", "disciplineId" );
    qb.join( Event::staticMetaObject, Event::mapping(), "SquadDiscipline", "event", "eventId" );
    qb.join( Status::staticMetaObject, Status::mapping(), "SquadDiscipline", "status", "statusId" );

    qb.where("SquadDiscipline", "eventId", pEvent->id());

    if( !squad.isNull() ){
        qb.where( "SquadDiscipline", "squad", squad );
    }

    if( disciplineId ){
        qb.where( "SquadDiscipline", "disciplineId", *disciplineId );
    }

    if( round ){
        qb.where( "SquadDiscipline", "round", *round );
    }

    qb.orderBy( "Discipline", "name" );

    auto output = qb.query( QSqlDatabase::database(entityManager()->connectionName()) );

    return output;
}
