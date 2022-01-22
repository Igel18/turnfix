#include "scorerepository.h"

QList< Score* > ScoreRepository::fetch( const int* competitionId /*= nullptr*/, const int* round /*= nullptr*/ )
{
    QueryBuilder<Score> qb;
    qb.select(Score::staticMetaObject, Score::mapping());
    qb.join(Athlete::staticMetaObject, Athlete::mapping(), "Score", "athlete", "athleteId");
    qb.join(Club::staticMetaObject, Club::mapping(), "Athlete", "club", "clubId");
    //qb.join(Group::staticMetaObject, Group::mapping(), "Score", "group", "groupId");
    //qb.join(Team::staticMetaObject, Team::mapping(), "Score", "team", "teamId");
    //qb.join(Status::staticMetaObject, Status::mapping(), "Score", "status", "statusId");
    qb.join(Competition::staticMetaObject, Competition::mapping(), "Score", "competition", "competitionId");

    if( competitionId ){
        qb.where( "Score", "competitionId", *competitionId );
    }

    if( round ){
        qb.where( "Score", "round", *round );
    }

    QList< Score *> output = qb.query( QSqlDatabase::database( entityManager()->connectionName() ) );

    return output;
}
