#include "disciplinefieldrepository.h"
#include "model/entity/discipline.h"
#include "model/entitymanager.h"
#include "model/querybuilder.h"

DisciplineFieldRepository::DisciplineFieldRepository( EntityManager *em )
    : AbstractRepository< DisciplineField >(em)
{

}

QList<DisciplineField *> DisciplineFieldRepository::loadByDiscipline(Discipline *discipline)
{
    QueryBuilder< DisciplineField > qb;
    qb.select(DisciplineField::staticMetaObject, DisciplineField::mapping());
    qb.where("DisciplineField", "disciplineId", discipline->id());
    qb.orderBy("DisciplineField", "sort");

    QList<DisciplineField *> output = qb.query( QSqlDatabase::database( entityManager()->connectionName() ) );

    foreach (DisciplineField *field, output) {
        field->setDiscipline(discipline);
    }

    return output;
}

QList< DisciplineField* > DisciplineFieldRepository::loadByDisciplineId( int disciplineId, bool* enabled /*= nullptr*/ )
{
    QueryBuilder< DisciplineField > qb;
    qb.select( DisciplineField::staticMetaObject, DisciplineField::mapping() );
    qb.join( Discipline::staticMetaObject, Discipline::mapping(), "DisciplineField", "discipline", "disciplineId" );
    qb.where( "DisciplineField", "disciplineId", disciplineId );

    if( enabled ){
        qb.where( "DisciplineField", "enabled", *enabled );
    }

    qb.orderBy( "DisciplineField", "sort" );

    auto output = qb.query( QSqlDatabase::database(entityManager()->connectionName()) );

    return output;
}
