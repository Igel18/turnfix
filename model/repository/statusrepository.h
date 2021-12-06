#ifndef STATUSREPOSITORY_H
#define STATUSREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/status.h"

class StatusRepository : public AbstractRepository<Status>
{
public:
    explicit StatusRepository(EntityManager *em);

    QList<Status *> loadAll();
    QList<Status *> loadByScorecard(bool scoredcard);
};

#endif // STATUSREPOSITORY_H
