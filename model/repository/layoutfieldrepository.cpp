#include "layoutfieldrepository.h"
#include "model/entity/layoutfield.h"
#include "model/entitymanager.h"
#include "model/querybuilder.h"
#include <QSqlQuery>

QList< LayoutField* > LayoutFieldRepository::loadAll( const int* id /*= nullptr*/ )
{
    QSqlDatabase db = QSqlDatabase::database(entityManager()->connectionName());

    QueryBuilder<LayoutField> qb;
    qb.select(LayoutField::staticMetaObject, LayoutField::mapping());
    qb.join(Layout::staticMetaObject, Layout::mapping(), "LayoutField", "layout", "layoutId");
    //Athleterepo: qb.join(Club::staticMetaObject, Club::mapping(), "Athlete", "club", "clubId");
//Athlete     athlete->addColumn("clubId", "int_vereineid", ColumnType::Integer, 0, false)
//    ->addContraint("fky_vereineid", "tfx_vereine", "int_vereineid", "RESTRICT", "RESTRICT");

    //Layoutfield     layoutField->addColumn("layoutId", "int_layoutid", ColumnType::Integer, 0, false)
//    ->addContraint("fky_layoutid", "tfx_layouts", "int_layoutid", "RESTRICT", "CASCADE");
    if(id) {
        qb.where("LayoutField", "id", *id );
    }
    QList<LayoutField *> output = qb.query(db);
    return output;
}

QList< LayoutField* > LayoutFieldRepository::loadLayout( int id )
{
    QSqlDatabase db = QSqlDatabase::database(entityManager()->connectionName());

    QueryBuilder<LayoutField> qb;
    qb.select(LayoutField::staticMetaObject, LayoutField::mapping());
    qb.join(Layout::staticMetaObject, Layout::mapping(), "LayoutField", "layout", "layoutId");
    qb.where("LayoutField", "layoutId", id );
    QList<LayoutField *> output = qb.query(db);
    return output;
}
