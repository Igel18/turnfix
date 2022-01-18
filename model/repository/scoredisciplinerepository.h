#ifndef SCOREDISCIPLINEREPOSITORY_H
#define SCOREDISCIPLINEREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/scorediscipline.h"


class ScoreDisciplineRepository : public AbstractRepository< ScoreDiscipline >
{
public:
    using AbstractRepository::AbstractRepository;

    QList< ScoreDiscipline* > fetch( const int* scoreId = nullptr, const int* disciplineId = nullptr );
};

#endif // SCOREDISCIPLINEREPOSITORY_H
