#ifndef COMPETITIONREPOSITORY_H
#define COMPETITIONREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/competition.h"

class Event;

class CompetitionRepository : public AbstractRepository< Competition >
{
public:
    using AbstractRepository::AbstractRepository;

    QList<Competition *> fetchByEvent(Event *event, int *type = nullptr);
    Competition* fetchByNumber( Event *event, QString number );
};

#endif // COMPETITIONREPOSITORY_H
