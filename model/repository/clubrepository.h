#ifndef CLUBREPOSITORY_H
#define CLUBREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/club.h"
#include "model/entity/event.h"

class Club;

class ClubRepository : public AbstractRepository< Club >
{
public:
    using AbstractRepository::AbstractRepository;

    QList<Club*> fetch( int *id = nullptr );
    QList<Club*> fetchByEvent(Event *event, int* id = nullptr );
    QList<Club*> fetchByEvent2(Event *event, int* id = nullptr );
};

#endif // CLUBREPOSITORY_H
