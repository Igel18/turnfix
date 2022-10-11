#include "layoutrepository.h"
#include "model/entity/layout.h"
#include "model/entitymanager.h"
#include "model/querybuilder.h"
#include <QSqlQuery>

QList< Layout* > LayoutRepository::loadAll( const int* id /*= nullptr*/ )
{
    QueryBuilder<Layout> qb;
    qb.select(Layout::staticMetaObject, Layout::mapping());

    if( id ){
        qb.where("Layout", "id", *id );
    }

    QList<Layout *> output = qb.query( QSqlDatabase::database( entityManager()->connectionName() ) );

    return output;
}
