#include "startingorderrepository.h"

StartingOrderRepository::StartingOrderRepository( EntityManager* em ) :
    AbstractRepository< StartingOrder >(em)
{

}

QList< StartingOrder* > StartingOrderRepository::fetch( const int* scoreId /*= nullptr*/, const int* disciplineId /*= nullptr*/, const int* type /*= nullptr*/ )
{
    QueryBuilder< StartingOrder > qb;
    qb.select(StartingOrder::staticMetaObject, StartingOrder::mapping());
    qb.join(Score::staticMetaObject, Score::mapping(), "StartingOrder", "score", "scoreId");
    qb.join(Discipline::staticMetaObject, Discipline::mapping(), "StartingOrder", "discipline", "disciplineId");

    if( scoreId ){
        qb.where( "StartingOrder", "scoreId", *scoreId );
    }

    if( disciplineId ){
        qb.where( "StartingOrder", "disciplineId", *disciplineId );
    }

    if( type ){
        qb.where( "StartingOrder", "type", *type );
    }

    auto output = qb.query( QSqlDatabase::database(entityManager()->connectionName()) );

    return output;
}
