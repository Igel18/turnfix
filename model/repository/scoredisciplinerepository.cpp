#include "scoredisciplinerepository.h"

QList< ScoreDiscipline* > ScoreDisciplineRepository::fetch( const int* scoreId /*= nullptr*/, const int* disciplineId /*= nullptr*/ )
{
    QueryBuilder< ScoreDiscipline > qb;

    qb.select(ScoreDiscipline::staticMetaObject, ScoreDiscipline::mapping());
    qb.join(Score::staticMetaObject, Score::mapping(), "ScoreDiscipline", "score", "scoreId");
    qb.join(Discipline::staticMetaObject, Discipline::mapping(), "ScoreDiscipline", "discipline", "disciplineId");

    if( scoreId ){
        qb.where( "ScoreDiscipline", "scoreId", *scoreId );
    }

    if( disciplineId ){
        qb.where( "ScoreDiscipline", "disciplineId", *disciplineId );
    }

    auto output = qb.query( QSqlDatabase::database(entityManager()->connectionName()) );

    return output;
}
