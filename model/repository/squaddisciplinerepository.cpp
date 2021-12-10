#include "squaddisciplinerepository.h"

#include "model/entity/discipline.h"
#include "model/entity/status.h"

SquadDisciplineRepository::SquadDisciplineRepository( EntityManager *em ) :
    AbstractRepository< SquadDiscipline >(em)
{

}

QList< SquadDiscipline* > SquadDisciplineRepository::load( Event* pEvent, QString squad /*= QString()*/ )
{
    QueryBuilder< SquadDiscipline > qb;
    qb.select( SquadDiscipline::staticMetaObject, SquadDiscipline::mapping() );
    qb.join( Discipline::staticMetaObject, Discipline::mapping(), "SquadDiscipline", "discipline", "disciplineId" );
    qb.where("SquadDiscipline", "eventId", pEvent->id());

    if( !squad.isNull() ){
        qb.where( "SquadDiscipline", "squad", squad );
    }

    qb.orderBy( "Discipline", "name" );

    auto output = qb.query( QSqlDatabase::database(entityManager()->connectionName()) );

    return output;
}
