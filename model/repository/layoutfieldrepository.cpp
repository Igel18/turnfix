#include "layoutfieldrepository.h"
#include "model/entity/layoutfield.h"
#include "model/entitymanager.h"
#include "model/querybuilder.h"
#include <QSqlQuery>

QList< LayoutField* > LayoutFieldRepository::loadAll( const int* id /*= nullptr*/ )
{
    QueryBuilder<LayoutField> qb;
    qb.select(LayoutField::staticMetaObject, LayoutField::mapping());

    if( id ){
        qb.where("LayoutField", "id", *id );
    }

    QList<LayoutField *> output = qb.query( QSqlDatabase::database( entityManager()->connectionName() ) );

    return output;
}

