#ifndef LAYOUTREPOSITORY_H
#define LAYOUTREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/layout.h"

class Layout;

class LayoutRepository : public AbstractRepository< Layout >
{
public:
    using AbstractRepository::AbstractRepository;

    QList< Layout* > loadAll( const int* id = nullptr );

};

#endif // LAYOUTREPOSITORY_H
