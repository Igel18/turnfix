#ifndef DISCIPLINEFIELDREPOSITORY_H
#define DISCIPLINEFIELDREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/disciplinefield.h"

class Discipline;

class DisciplineFieldRepository : public AbstractRepository< DisciplineField >
{
public:
    using AbstractRepository::AbstractRepository;

    QList< DisciplineField* > loadByDiscipline( Discipline *discipline );
    QList< DisciplineField* > loadByDisciplineId( int disciplineId, bool* enabled = nullptr );
    DisciplineField* fetchOne( int disciplineId, const bool* baseScore = nullptr, const bool* enabled = nullptr );
};

#endif // DISCIPLINEFIELDREPOSITORY_H
