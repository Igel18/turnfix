#ifndef CLUBREPOSITORY_H
#define CLUBREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/club.h"

class Club;

class ClubRepository : public AbstractRepository< Club >
{
public:
    using AbstractRepository::AbstractRepository;

    QList< Club* > fetch( const int* id = nullptr );
};

#endif // CLUBREPOSITORY_H
