#ifndef DISCIPLINEFIELDREPOSITORY_H
#define DISCIPLINEFIELDREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/disciplinefield.h"

class Discipline;

class DisciplineFieldRepository : public AbstractRepository< DisciplineField >
{
public:
    explicit DisciplineFieldRepository(EntityManager *em);

    QList< DisciplineField* > loadByDiscipline( Discipline *discipline );
    QList< DisciplineField* > loadByDisciplineId( int disciplineId, bool* enabled = nullptr );
};

#endif // DISCIPLINEFIELDREPOSITORY_H
