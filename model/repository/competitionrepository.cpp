#include "competitionrepository.h"
#include "model/entity/event.h"
#include "model/entitymanager.h"

QList<Competition *> CompetitionRepository::fetchByEvent(Event *event, int *type /*= nullptr*/)
{
    QueryBuilder<Competition> qb;
    qb.select(Competition::staticMetaObject, Competition::mapping());
    qb.join(Division::staticMetaObject, Division::mapping(), "Competition", "division", "divisionId");
    qb.where("Competition", "eventId", event->id());

    if( type ){
        qb.where("Competition", "type", *type);
    }

    qb.orderBy("Competition", "number");

    auto output = qb.query( QSqlDatabase::database( entityManager()->connectionName() ) );

    for(auto& competition : output ){
        competition->setEvent( event );
    }

    return output;
}

Competition* CompetitionRepository::fetchByNumber( Event *event, QString number )
{
    QueryBuilder< Competition > qb;
    qb.select( Competition::staticMetaObject, Competition::mapping());
    qb.join( Division::staticMetaObject, Division::mapping(), "Competition", "division", "divisionId" );
    qb.where( "Competition", "eventId", event->id() );
    qb.where( "Competition", "number", number );
    auto output = qb.query( QSqlDatabase::database( entityManager()->connectionName() ) );

    for(auto& competition : output ){
        competition->setEvent( event );
        return competition; // return 1st occurrence (should be one record)
    }

    return nullptr;
}
