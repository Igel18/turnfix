#include "scorerepository.h"

ScoreRepository::ScoreRepository(EntityManager* em) :
    AbstractRepository<Score>(em)
{

}

QList< Score* > ScoreRepository::fetch(int* competitionId /*= nullptr*/)
{
    QSqlDatabase db = QSqlDatabase::database(entityManager()->connectionName());

    QueryBuilder<Score> qb;
    qb.select(Score::staticMetaObject, Score::mapping());
    //qb.join(Athlete::staticMetaObject, Athlete::mapping(), "Score", "athlete", "athleteId");
    //qb.join(Group::staticMetaObject, Group::mapping(), "Score", "group", "groupId");
    //qb.join(Team::staticMetaObject, Team::mapping(), "Score", "team", "teamId");
    //qb.join(Status::staticMetaObject, Status::mapping(), "Score", "status", "statusId");

    if(competitionId){
        qb.where("Score", "competitionId", *competitionId);
    }

    QList< Score *> output = qb.query(db);

    return output;
}
