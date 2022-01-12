#include "competitiondisciplinerepository.h"
#include "model/entity/competitiondiscipline.h"
#include "model/entity/discipline.h"
#include "model/entitymanager.h"

CompetitionDisciplineRepository::CompetitionDisciplineRepository(EntityManager *em)
    : AbstractRepository<CompetitionDiscipline>(em)
{
    
}

QList<CompetitionDiscipline *> CompetitionDisciplineRepository::fetchByCompetition(
    Competition *competition)
{
    int competitionid = competition->id();
    QSqlDatabase db = QSqlDatabase::database(entityManager()->connectionName());
    QueryBuilder<CompetitionDiscipline> qb;
    qb.select(CompetitionDiscipline::staticMetaObject, CompetitionDiscipline::mapping());
    qb.join(Discipline::staticMetaObject, Discipline::mapping(), "CompetitionDiscipline", "discipline", "disciplineId");
    qb.where("CompetitionDiscipline", "id", competitionid);
    qb.orderBy("CompetitionDiscipline", "sort");

    auto output = qb.query(db);

    for (auto competitionDiscipline : output) {
        competitionDiscipline->setCompetition(competition);
    }

    return output;
}
