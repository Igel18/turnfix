#ifndef JURYSCOREREPOSITORY_H
#define JURYSCOREREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/juryscore.h"

class JuryScoreRepository : public AbstractRepository< JuryScore >
{
public:

    using AbstractRepository::AbstractRepository;

    QList< JuryScore* > fetch(
            int* scoreId = nullptr,
            int* disciplineFieldId = nullptr,
            int* attempt = nullptr,
            double* performance = nullptr,
            int* type = nullptr );
};

#endif // JURYSCOREREPOSITORY_H
