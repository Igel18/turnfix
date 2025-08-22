#include "scorerepository.h"

QueryBuilder<Score> ScoreRepository::prepareQuery(const int* competitionId /*= nullptr*/, const int* round /*= nullptr*/)
{
    QueryBuilder<Score> qb;
    qb.select(Score::staticMetaObject, Score::mapping());
    qb.join(Athlete::staticMetaObject, Athlete::mapping(), "Score", "athlete", "athleteId");
    qb.join(Club::staticMetaObject, Club::mapping(), "Athlete", "club", "clubId");
    qb.join(Competition::staticMetaObject, Competition::mapping(), "Score", "competition", "competitionId");

    if (competitionId) {
        qb.where("Score", "competitionId", *competitionId);
    }

    if (round) {
        qb.where("Score", "round", *round);
    }

    return qb;
}

/*
 * Fetches all scores of table tfx_wertungen
 * @param competitionId optional filter for competitionId
 * @param round optional filter for round
 * @return list of Score objects
 */
QList< Score* > ScoreRepository::fetch( const int* competitionId /*= nullptr*/, const int* round /*= nullptr*/ )
{
    QueryBuilder<Score> qb = prepareQuery(competitionId, round);
    QList< Score *> output = qb.query( QSqlDatabase::database( entityManager()->connectionName() ) );
    return output;
}

