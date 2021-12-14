#include "squaddata.h"

#include <QStandardItem>

bool SquadData::operator==(const SquadData& rhs) const
{
    return ( this->name == rhs.name );
}

QList< QStandardItem* > SquadData::toModelItems() const
{
    QList< QStandardItem* > items = {
        new QStandardItem( name ),
        new QStandardItem( QString("%1").arg( participantsCount ) ),
        new QStandardItem( QString("%1").arg( teamsCount )),
        new QStandardItem( QString("%1").arg( groupsCount )),
        new QStandardItem( firstDiscipline )
    };

    for(auto i = 0; i < 4; ++i) {
        items.at( i )->setEditable( false );
    }

    return items;
}


