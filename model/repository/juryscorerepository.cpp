#include "juryscorerepository.h"

QList< JuryScore* > JuryScoreRepository::fetch(
        int* scoreId /*= nullptr*/,
        int* disciplineFieldId /*= nullptr*/,
        int* attempt /*= nullptr*/,
        double* performance /*= nullptr*/,
        int* type /*= nullptr*/ )
{
    QueryBuilder< JuryScore > qb;

    qb.select(JuryScore::staticMetaObject, JuryScore::mapping());
    qb.join(Score::staticMetaObject, Score::mapping(), "JuryScore", "score", "scoreId");
    qb.join(DisciplineField::staticMetaObject, DisciplineField::mapping(), "JuryScore", "disciplineField", "disciplineFieldId");

    if( scoreId ){
        qb.where( "JuryScore", "scoreId", *scoreId );
    }

    if( disciplineFieldId ){
        qb.where( "JuryScore", "disciplineFieldId", *disciplineFieldId );
    }

    if( attempt ){
        qb.where( "JuryScore", "attempt", *attempt );
    }

    if( performance ){
        qb.where( "JuryScore", "performance", *performance );
    }

    if( type ){
        qb.where( "JuryScore", "type", *type );
    }

    auto output = qb.query( QSqlDatabase::database(entityManager()->connectionName()) );

    return output;
}
