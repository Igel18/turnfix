#include "clubrepository.h"
#include "model/entity/person.h"
#include "model/entitymanager.h"
#include "model/querybuilder.h"
#include <QSqlQuery>

QList< Club* > ClubRepository::fetch( const int* id /*= nullptr*/ )
{
    QueryBuilder<Club> qb;
    qb.select(Club::staticMetaObject, Club::mapping());
    qb.join(Person::staticMetaObject, Person::mapping(), "Club", "contactPerson", "contactPersonId");

    if( id ){
        qb.where("Club", "id", *id );
    }

    qb.orderBy("Club", "name");

    QList<Club *> output = qb.query( QSqlDatabase::database( entityManager()->connectionName() ) );

    return output;
}
