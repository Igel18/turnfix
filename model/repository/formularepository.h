#ifndef FORMULAREPOSITORY_H
#define FORMULAREPOSITORY_H

#include "abstractrepository.h"

class Formula;

class FormulaRepository : public AbstractRepository<Formula>
{
public:
    using AbstractRepository::AbstractRepository;
    QList< Formula* > loadAll( const int* id = nullptr );
};

#endif // FORMULAREPOSITORY_H
