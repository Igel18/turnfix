#include "disciplinerepository.h"
#include "model/entity/formula.h"
#include "model/entity/sport.h"
#include "model/entitymanager.h"
#include "model/querybuilder.h"


DisciplineRepository::DisciplineRepository(EntityManager *em)
    : AbstractRepository<Discipline>(em)
{}

/*
 * Load all disziplines and returns a list of them.
*/
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

/*
 * Load all disziplines and returns this one with the matching id otherwise a nullptr.
*/
Discipline* DisciplineRepository::loadDiscipline(int id)
{
    QSqlDatabase db = QSqlDatabase::database(entityManager()->connectionName());

    QueryBuilder<Discipline> qb;
    qb.select(Discipline::staticMetaObject, Discipline::mapping());
    qb.join(Sport::staticMetaObject, Sport::mapping(), "Discipline", "sport", "sportId");
    qb.join(Formula::staticMetaObject, Formula::mapping(), "Discipline", "formula", "formulaId");
    qb.where( "Discipline", "id", id );
    auto resultSet = qb.query(db);
    return resultSet.isEmpty() ? nullptr : resultSet.at( 0 );
}

/*
 * Load all disziplines and returns a list of ids of the disziplines.
*/
QList<int *> DisciplineRepository::loadDisciplineIds(const bool* const women /*= nullptr*/, const bool* const men /*= nullptr*/, bool joinFormula /*= true*/ )
{
    auto disz = loadDisciplines(women, men, joinFormula);
    QList<int *> output;
    for(int i = 1; disz.count() > i; i++)
    {
        int zahl = disz[i]->id();
        output.append(&zahl);
    }

    QSqlDatabase db = QSqlDatabase::database(entityManager()->connectionName());

    QueryBuilder<Discipline> qb;
    qb.select(Discipline::staticMetaObject, Discipline::mapping());
    //qb.join(Sport::staticMetaObject, Sport::mapping(), "Discipline", "sport", "sportId");
    //qb.join(Formula::staticMetaObject, Formula::mapping(), "Discipline", "formula", "formulaId");
   // qb.where( "Discipline", "id", id );
   // auto resultSet = qb.query(db);
   // return resultSet.isEmpty() ? nullptr : resultSet.at( 0 );


    //    QSqlQuery disziplinenQuery( db );
    //    disziplinenQuery.prepare("
    //SELECT DISTINCT int_disziplinenid, CASE WHEN tfx_wettkaempfe.bol_kp='true' OR tfx_wettkaempfe_x_disziplinen.bol_kp='true' THEN 1 ELSE 0 END as kp, tfx_disziplinen.var_name
    //FROM tfx_disziplinen
    //INNER JOIN tfx_wettkaempfe_x_disziplinen USING (int_disziplinenid)
    //INNER JOIN tfx_wettkaempfe USING (int_wettkaempfeid)
    //WHERE int_veranstaltungenid=? GROUP BY int_disziplinenid, tfx_wettkaempfe.bol_kp, tfx_wettkaempfe_x_disziplinen.bol_kp, tfx_disziplinen.var_name
    //ORDER BY tfx_disziplinen.var_name, kp");
    //    disziplinenQuery.bindValue( 0, m_event->mainEvent()->id() );
    //    disziplinenQuery.exec();
    //    disziplinenIDs.clear();
    //    while (disziplinenQuery.next()) {
    //        QList<int> lst;
    //        lst.append(disziplinenQuery.value(0).toInt());
    //        lst.append(0);
    //        disziplinenIDs.append(lst);
    //        if (disziplinenQuery.value(1).toInt()==1) {
    //            lst.replace(1,1);
    //            disziplinenIDs.append(lst);
    //        }
    //    }

    return output;
}

