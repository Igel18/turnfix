#ifndef SCOREREPOSITORY_H
#define SCOREREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/score.h"

class ScoreRepository : public AbstractRepository< Score >
{
public:
    using AbstractRepository::AbstractRepository;

    QList< Score* > fetch( const int* competitionId = nullptr, const int* round = nullptr );
};

#endif // SCOREREPOSITORY_H
