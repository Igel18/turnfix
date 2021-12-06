#ifndef SCOREREPOSITORY_H
#define SCOREREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/score.h"

class ScoreRepository : public AbstractRepository< Score >
{
public:
    explicit ScoreRepository(EntityManager* em);

    QList< Score* > fetch(int* competitionId = nullptr);
};

#endif // SCOREREPOSITORY_H
