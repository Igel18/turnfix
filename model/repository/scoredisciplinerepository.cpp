#include "scoredisciplinerepository.h"

ScoreDisciplineRepository::ScoreDisciplineRepository( EntityManager* em ) :
    AbstractRepository< ScoreDiscipline >(em)
{

}

QList< ScoreDiscipline* > ScoreDisciplineRepository::fetch()
{
    QueryBuilder< ScoreDiscipline > qb;

    qb.select(ScoreDiscipline::staticMetaObject, ScoreDiscipline::mapping());
    qb.join(Score::staticMetaObject, Score::mapping(), "Score", "score", "scoreId");
    qb.join(Discipline::staticMetaObject, Discipline::mapping(), "Discipline", "discipline", "disciplineId");

    auto output = qb.query( QSqlDatabase::database(entityManager()->connectionName()) );

    return output;
}
