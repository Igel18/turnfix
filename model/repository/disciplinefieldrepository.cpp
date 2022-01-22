#include "disciplinefieldrepository.h"
#include "model/entity/discipline.h"
#include "model/entitymanager.h"
#include "model/querybuilder.h"

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

DisciplineField* DisciplineFieldRepository::fetchOne( int disciplineId, const bool* baseScore /*= nullptr*/, const bool* enabled /*= nullptr*/ )
{
    QueryBuilder< DisciplineField > qb;
    qb.select( DisciplineField::staticMetaObject, DisciplineField::mapping() );
    qb.join( Discipline::staticMetaObject, Discipline::mapping(), "DisciplineField", "discipline", "disciplineId" );

    qb.where( "DisciplineField", "disciplineId", disciplineId );

    if( baseScore ){
        qb.where( "DisciplineField", "baseScore", *baseScore );
    }

    if( enabled ){
        qb.where( "DisciplineField", "enabled", *enabled );
    }

    auto output = qb.query( QSqlDatabase::database(entityManager()->connectionName()) );

    if( !output.isEmpty() ){
        return output.at( 0 );
    }

    return nullptr;
}
