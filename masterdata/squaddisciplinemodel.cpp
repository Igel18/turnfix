#include "squaddisciplinemodel.h"

#include "model/repository/squaddisciplinerepository.h"
#include "model/enums.h"

SquadDisciplineModel::SquadDisciplineModel(EntityManager *em, Event *event, QObject *parent) :
    QAbstractTableModel(parent), m_em(em), m_event(event)
{

}

int SquadDisciplineModel::rowCount([[maybe_unused]] const QModelIndex &parent) const
{
    return m_data.count();
}

int SquadDisciplineModel::columnCount([[maybe_unused]] const QModelIndex &parent) const
{
    return 4;
}

QVariant SquadDisciplineModel::headerData(int section, Qt::Orientation orientation, int role) const
{
    if (role == Qt::DisplayRole && orientation == Qt::Horizontal) {
        static QStringList colNames = { "Discipline", "Short Name", "Sort Name 2" "Squad" };
        return colNames.at( section );
    }

    return QVariant();
}

QVariant SquadDisciplineModel::data(const QModelIndex &index, int role) const
{
    if (!index.isValid())
        return QVariant();

    auto pItemData = m_data.at(index.row());

    if(role == Qt::DisplayRole){
        switch (index.column()) {
        case 0:
            return pItemData->discipline()->name();
        case 1:
            return pItemData->discipline()->shortName1();
        case 2:
            return pItemData->discipline()->shortName2();
        case 3:
            return pItemData->squad();
        }
    } else if (role == TF::ObjectRole) {
        return QVariant::fromValue( pItemData );
    } else if (role == TF::IdRole) {
        return pItemData->id();
    }

    return QVariant();
}

void SquadDisciplineModel::fetchData( QString squad /*= QString()*/ )
{
    beginResetModel();
    m_data = m_em->squadDisciplineRepository()->load( m_event, squad );
    endResetModel();
}
