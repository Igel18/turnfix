#include "layoutrepository.h"
#include "model/entity/layout.h"
#include "model/entitymanager.h"
#include "model/querybuilder.h"
#include <QSqlQuery>

QList< Layout* > LayoutRepository::fetch( const int* id /*= nullptr*/ )
{
    QueryBuilder<Layout> qb;
    qb.select(Layout::staticMetaObject, Layout::mapping());
  //  qb.join(Person::staticMetaObject, Person::mapping(), "Club", "contactPerson", "contactPersonId");

    if( id ){
        qb.where("Layout", "id", *id );
    }

   // qb.orderBy("Club", "name");

    QList<Layout *> output = qb.query( QSqlDatabase::database( entityManager()->connectionName() ) );

    return output;
}
