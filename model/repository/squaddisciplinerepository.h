#ifndef SQUADDISCIPLINEREPOSITORY_H
#define SQUADDISCIPLINEREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/squaddiscipline.h"

class Event;

class SquadDisciplineRepository : public AbstractRepository< SquadDiscipline >
{
public:
    using AbstractRepository::AbstractRepository;

    QList< SquadDiscipline* > load( Event* pEvent,
                                    QString squad = QString(),
                                    const int* disciplineId = nullptr,
                                    const int* round = nullptr );
};

#endif // SQUADDISCIPLINEREPOSITORY_H
