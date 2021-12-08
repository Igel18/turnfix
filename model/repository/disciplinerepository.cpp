#include "disciplinerepository.h"
#include "model/entity/formula.h"
#include "model/entity/sport.h"
#include "model/entitymanager.h"
#include "model/querybuilder.h"


DisciplineRepository::DisciplineRepository(EntityManager *em)
    : AbstractRepository<Discipline>(em)
{}

QList<Discipline *> DisciplineRepository::loadDisciplines(const bool* const women /*= nullptr*/, const bool* const men /*= nullptr*/, bool joinFormula /*= true*/ )
{
    QSqlDatabase db = QSqlDatabase::database(entityManager()->connectionName());

    QueryBuilder<Discipline> qb;
    qb.select(Discipline::staticMetaObject, Discipline::mapping());
    qb.join(Sport::staticMetaObject, Sport::mapping(), "Discipline", "sport", "sportId");

    if( joinFormula ) {
        qb.join(Formula::staticMetaObject, Formula::mapping(), "Discipline", "formula", "formulaId");
    }

    if( women ){
        qb.where("Discipline", "women", *women);
    }

    if( men )
    {
        qb.where("Discipline", "men", *men);
    }

    qb.orderBy("Discipline", "name");

    QList<Discipline *> output = qb.query(db);

    return output;
}
