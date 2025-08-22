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

    QList< Club* > fetch( int *id = nullptr );
    QList< Club* > fetchClubByEvent(Event *event, const int* id = nullptr );

};

#endif // CLUBREPOSITORY_H
