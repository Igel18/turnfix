#include "startingorderrepository.h"

StartingOrderRepository::StartingOrderRepository( EntityManager* em ) :
    AbstractRepository< StartingOrder >(em)
{

}

QList< StartingOrder* > StartingOrderRepository::fetch( int* scoreId /*= nullptr*/, int* disciplineId /*= nullptr*/ )
{
    QueryBuilder< StartingOrder > qb;
    qb.select(StartingOrder::staticMetaObject, StartingOrder::mapping());
    qb.join(Score::staticMetaObject, Score::mapping(), "Score", "score", "scoreId");
    qb.join(Discipline::staticMetaObject, Discipline::mapping(), "Discipline", "discipline", "disciplineId");

    if( scoreId ){
        qb.where( "StartingOrder", "scoreId", *scoreId );
    }

    if( disciplineId ){
        qb.where( "StartingOrder", "disciplineId", *disciplineId );
    }

    auto output = qb.query( QSqlDatabase::database(entityManager()->connectionName()) );

    return output;
}
