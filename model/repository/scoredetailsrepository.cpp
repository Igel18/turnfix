#include "scoredetailsrepository.h"

QList< ScoreDetails* > ScoreDetailsRepository::fetch(
        int* scoreId /*= nullptr*/,
        int* disciplineId /*= nullptr*/,
        int* attempt /*= nullptr*/,
        double* performance /*= nullptr*/,
        int* type /*= nullptr*/ )
{
    QueryBuilder< ScoreDetails > qb;

    qb.select(ScoreDetails::staticMetaObject, ScoreDetails::mapping());
    qb.join(Score::staticMetaObject, Score::mapping(), "ScoreDetails", "score", "scoreId");
    qb.join(Discipline::staticMetaObject, Discipline::mapping(), "ScoreDetails", "discipline", "disciplineId");

    if( scoreId ){
        qb.where( "ScoreDetails", "scoreId", *scoreId );
    }

    if( disciplineId ){
        qb.where( "ScoreDetails", "disciplineId", *disciplineId );
    }

    if( attempt ){
        qb.where( "ScoreDetails", "attempt", *attempt );
    }

    if( performance ){
        qb.where( "ScoreDetails", "performance", *performance );
    }

    if( type ){
        qb.where( "ScoreDetails", "type", *type );
    }

    auto output = qb.query( QSqlDatabase::database(entityManager()->connectionName()) );

    return output;
}
