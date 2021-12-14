#include "statusrepository.h"

StatusRepository::StatusRepository(EntityManager *em)
    : AbstractRepository<Status>(em)
{
    
}

QList< Status* > StatusRepository::load(bool* scoredcard /*= nullptr*/, bool* scoresheet /*= nullptr*/)
{
    QueryBuilder< Status > qb;
    qb.select(Status::staticMetaObject, Status::mapping());

    if( scoredcard ){
        qb.where( "Status", "scorecard", *scoredcard );
    }

    if( scoresheet ){
        qb.where( "Status", "scoresheet", *scoresheet );
    }

    qb.orderBy("Status", "name");

    auto output = qb.query( QSqlDatabase::database( entityManager()->connectionName() ) );

    return output;
}
