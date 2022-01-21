#include "competitionproxymodel.h"
#include "competitions/competitionmodel.h"

CompetitionProxyModel::CompetitionProxyModel(QString prefix /*= ""*/, QObject *parent)
    : QIdentityProxyModel(parent), m_sPrefix( prefix )
{

}

void CompetitionProxyModel::setSourceModel(QAbstractItemModel *sourceModel)
{
    if( sourceModel )
    {
        Q_ASSERT_X( qobject_cast< CompetitionModel* >(sourceModel),
                    "CompetitionProxyModel::setSourceModel",
                    "Only CompetitionModel supported as a source model!" );
    }

    QIdentityProxyModel::setSourceModel( sourceModel );
}

QVariant CompetitionProxyModel::data(const QModelIndex &index, int role) const
{
    if ( role != Qt::DisplayRole || index.column() != 0 ){
        return QIdentityProxyModel::data( index, role );
    }

    auto sNumber = sourceModel()->data( sourceModel()->index( index.row(), 0 ) ).toString();
    auto sName = sourceModel()->data( sourceModel()->index( index.row(), 1 ) ).toString();

    return QString( "%1 %2 %3" ).arg( m_sPrefix, sNumber, sName ).trimmed();
}

void CompetitionProxyModel::setPrefix( QString prefix ){
    m_sPrefix = prefix;
}
