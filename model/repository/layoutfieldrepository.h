#ifndef LAYOUTFIELDREPOSITORY_H
#define LAYOUTFIELDREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/layoutfield.h"

class LayoutField;

class LayoutFieldRepository : public AbstractRepository< LayoutField >
{
public:
    using AbstractRepository::AbstractRepository;

    QList< LayoutField* > loadAll( const int* id = nullptr );
    QList< LayoutField* > loadLayout( int layoutId );
};

#endif // LAYOUTFIELDREPOSITORY_H
