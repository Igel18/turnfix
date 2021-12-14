#ifndef SCOREDISCIPLINEREPOSITORY_H
#define SCOREDISCIPLINEREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/scorediscipline.h"



class ScoreDisciplineRepository : public AbstractRepository< ScoreDiscipline >
{
public:
    explicit ScoreDisciplineRepository( EntityManager* em );

    QList< ScoreDiscipline* > fetch();
};

#endif // SCOREDISCIPLINEREPOSITORY_H
