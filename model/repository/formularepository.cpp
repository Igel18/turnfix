#include "formularepository.h"
#include "model/entity/formula.h"
#include "model/entitymanager.h"
#include "model/querybuilder.h"

QList<Formula *> FormulaRepository::loadAll( const int* id /*= nullptr*/ )
{
    QSqlDatabase db = QSqlDatabase::database(entityManager()->connectionName());

    QueryBuilder<Formula> qb;
    qb.select(Formula::staticMetaObject, Formula::mapping());
    qb.orderBy("Formula", "name");

    if( id ){
        qb.where( "Formula", "id", *id );
    }

    QList<Formula *> output = qb.query(db);

    return output;
}
