#include "competitiondisciplinerepository.h"
#include "model/entity/competitiondiscipline.h"
#include "model/entity/discipline.h"
#include "model/entitymanager.h"


QList<CompetitionDiscipline *> CompetitionDisciplineRepository::fetchByCompetition( Competition *competition, int* disciplineId /*= nullptr*/ )
{
    QueryBuilder<CompetitionDiscipline> qb;

    qb.select(CompetitionDiscipline::staticMetaObject, CompetitionDiscipline::mapping());
    qb.join(Discipline::staticMetaObject, Discipline::mapping(), "CompetitionDiscipline", "discipline", "disciplineId");

    qb.where("CompetitionDiscipline", "competitionId", competition->id());

    if( disciplineId ){
        qb.where("CompetitionDiscipline", "disciplineId", *disciplineId );
    }

    qb.orderBy("CompetitionDiscipline", "sort");

    auto output = qb.query( QSqlDatabase::database(entityManager()->connectionName()) );

    for (auto competitionDiscipline : output) {
        competitionDiscipline->setCompetition(competition);
    }

    return output;
}

QList< CompetitionDiscipline* > CompetitionDisciplineRepository::load( int eventId,
                                                                       QString competitionNumber /*= QString()*/,
                                                                       int disciplineId /*= 0*/)
{
    QSqlDatabase db = QSqlDatabase::database( entityManager()->connectionName() );
    QueryBuilder< CompetitionDiscipline > qb;
    qb.select( CompetitionDiscipline::staticMetaObject, CompetitionDiscipline::mapping() );
    qb.join(Discipline::staticMetaObject, Discipline::mapping(), "CompetitionDiscipline", "discipline", "disciplineId");
    qb.join(Competition::staticMetaObject, Competition::mapping(), "CompetitionDiscipline", "competition", "competitionId");
    qb.where( "Competition", "eventId", eventId );

    if( !competitionNumber.isEmpty() ){
        qb.where( "Competition", "number", competitionNumber );
    }

    if( disciplineId > 0 ){
        qb.where("CompetitionDiscipline", "disciplineId", disciplineId );
    }

    qb.orderBy("CompetitionDiscipline", "sort");

    auto output = qb.query(db);

    return output;
}
