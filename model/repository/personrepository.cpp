#include "personrepository.h"
#include "model/dbcolumn.h"
#include "model/dbtable.h"
#include "model/entitymanager.h"
#include <QMetaProperty>
#include <QSqlQuery>

PersonRepository::PersonRepository(EntityManager *em)
    : AbstractRepository<Person>(em)
{}

QList<Person *> PersonRepository::loadAll()
{
    QueryBuilder<Person> qb;
    qb.select(Person::staticMetaObject, Person::mapping());
    qb.orderBy("Person", "lastName");
    qb.orderBy("Person", "firstName");

    auto output = qb.query(QSqlDatabase::database( entityManager()->connectionName()));

    return output;
}
