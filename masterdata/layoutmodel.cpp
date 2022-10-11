#include "layoutmodel.h"
#include "model/entity/layout.h"
#include "model/entitymanager.h"
#include "model/enums.h"
#include "model/repository/layoutrepository.h"

LayoutModel::LayoutModel(EntityManager *em, QObject *parent)
    : QAbstractTableModel(parent)
    , m_em(em)
{
}

int LayoutModel::rowCount(const QModelIndex &) const
{
    return m_layouts.size();
}

int LayoutModel::columnCount(const QModelIndex &) const
{
    return 2;
}

QVariant LayoutModel::headerData(int section, Qt::Orientation orientation, int role) const
{
    if (role == Qt::DisplayRole && orientation == Qt::Horizontal) {
        switch (section) {
           case 0:
                return tr("Name");
            case 1:
                return tr("Comment");
        }
    }
    return QVariant();
}

QVariant LayoutModel::data(const QModelIndex &index, int role) const
{
    if (!index.isValid())
        return QVariant();

    Layout *layout = m_layouts.at(index.row());
    if (role == Qt::DisplayRole || role == Qt::EditRole) {
        switch (index.column()) {
        case 0:
            return layout->name();
        case 1:
            return layout->comment();
        }
    } else if (role == TF::ObjectRole) {
        return QVariant::fromValue(layout);
    } else if (role == TF::IdRole) {
        return layout->id();
    }
    return QVariant();
}

void LayoutModel::fetchLayouts()
{
    beginResetModel();
    m_layouts = m_em->layoutRepository()->loadAll();
    endResetModel();
}


