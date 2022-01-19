#ifndef STARTINGORDERREPOSITORY_H
#define STARTINGORDERREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/startingorder.h"

class StartingOrderRepository : public AbstractRepository< StartingOrder >
{
public:
    explicit StartingOrderRepository( EntityManager* em );

    QList< StartingOrder* > fetch( const int* scoreId = nullptr, const int* disciplineId = nullptr, const int* type = nullptr );
};

#endif // STARTINGORDERREPOSITORY_H
