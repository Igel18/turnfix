#ifndef SCOREDETAILSREPOSITORY_H
#define SCOREDETAILSREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/scoredetails.h"

class ScoreDetailsRepository : public AbstractRepository< ScoreDetails >
{
public:
    using AbstractRepository::AbstractRepository;

    QList< ScoreDetails* > fetch(
            int* scoreId = nullptr,
            int* disciplineId = nullptr,
            int* attempt = nullptr,
            double* performance = nullptr,
            int* type = nullptr );
};

#endif // SCOREDETAILSREPOSITORY_H
