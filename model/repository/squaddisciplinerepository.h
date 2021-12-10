#ifndef SQUADDISCIPLINEREPOSITORY_H
#define SQUADDISCIPLINEREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/squaddiscipline.h"

class Event;

class SquadDisciplineRepository : public AbstractRepository< SquadDiscipline >
{
public:
    explicit SquadDisciplineRepository(EntityManager *em);

    QList< SquadDiscipline* > load( Event* pEvent, QString squad = QString() );
};

#endif // SQUADDISCIPLINEREPOSITORY_H
