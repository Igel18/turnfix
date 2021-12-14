#ifndef STARTINGORDERREPOSITORY_H
#define STARTINGORDERREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/startingorder.h"

class StartingOrderRepository : public AbstractRepository< StartingOrder >
{
public:
    explicit StartingOrderRepository( EntityManager* em );

    QList< StartingOrder* > fetch( int* scoreId = nullptr, int* disciplineId = nullptr );
};

#endif // STARTINGORDERREPOSITORY_H
