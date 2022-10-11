#include "layoutfieldmodel.h"
#include "model/entity/layoutfield.h"
#include "model/entitymanager.h"
#include "model/enums.h"
#include "model/repository/layoutfieldrepository.h"

LayoutFieldModel::LayoutFieldModel(EntityManager *em, QObject *parent)
    : QAbstractTableModel(parent)
    , m_em(em)
{
}

int LayoutFieldModel::rowCount(const QModelIndex &) const
{
    return m_layoutfields.size();
}

int LayoutFieldModel::columnCount(const QModelIndex &) const
{
    return 10;
}

QVariant LayoutFieldModel::headerData(int section, Qt::Orientation orientation, int role) const
{
    if (role == Qt::DisplayRole && orientation == Qt::Horizontal) {
        switch (section) {
           case 0:
                return tr("LayoutId");
            case 1:
                return tr("Typ");
            case 2:
                return tr("font");
            case 3:
                return tr("x");
            case 4:
                return tr("y");
            case 5:
                return tr("width");
            case 6:
                return tr("height");
            case 7:
                return tr("value");
            case 8:
                return tr("align");
            case 9:
                return tr("layer");
        }
    }
    return QVariant();
}

QVariant LayoutFieldModel::data(const QModelIndex &index, int role) const
{
    if (!index.isValid())
        return QVariant();

    LayoutField *layoutfield = m_layoutfields.at(index.row());
    if (role == Qt::DisplayRole || role == Qt::EditRole) {
        switch (index.column()) {
        case 0:
            return layoutfield->id();
        case 1:
            return layoutfield->type();
        case 3:
            return layoutfield->x();
        case 4:
            return layoutfield->y();
        case 5:
            return layoutfield->width();
        case 6:
            return layoutfield->height();
        case 7:
            return layoutfield->value();
        case 8:
            return layoutfield->align();
        case 9:
            return layoutfield->layer();

        }
    } else if (role == TF::ObjectRole) {
        return QVariant::fromValue(layoutfield);
    } else if (role == TF::IdRole) {
        return layoutfield->id();
    }
    return QVariant();
}

void LayoutFieldModel::fetchLayoutFields()
{
    beginResetModel();
    m_layoutfields = m_em->layoutFieldRepository()->loadAll();
    endResetModel();
}
