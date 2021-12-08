#include "participantsquadmodel.h"

#include "model/enums.h"
#include "model/entity/score.h"
#include "participants/participantsmodel.h"

ParticipantSquadModel::ParticipantSquadModel(QString squadName, bool inSquad /*= true*/, QObject *parent /*= nullptr*/) :
    QSortFilterProxyModel(parent), m_sSquadName(squadName), m_bInSquad( inSquad )
{

}

QString ParticipantSquadModel::squadName() const
{
    return m_sSquadName;
}

void ParticipantSquadModel::setSquadName( QString squadName )
{
    m_sSquadName = squadName;
    invalidateFilter();
}

bool ParticipantSquadModel::inSquad() const
{
    return m_bInSquad;
}

void ParticipantSquadModel::setInSquad( bool inSquad )
{
    m_bInSquad = inSquad;
    invalidateFilter();
}

void ParticipantSquadModel::setSourceModel(QAbstractItemModel *sourceModel)
{
    auto pSourceModel = qobject_cast< ParticipantsModel* >( sourceModel );

    if( !pSourceModel ) {
        throw "Only ParticipantsModel as a source model supported";
    }

    QSortFilterProxyModel::setSourceModel( sourceModel );
}

bool ParticipantSquadModel::filterAcceptsRow(int sourceRow, const QModelIndex &sourceParent) const
{
    auto idxSquad = sourceModel()->index(sourceRow, 6, sourceParent );
    auto pScore = qvariant_cast< Score* >(sourceModel()->data( idxSquad, TF::ObjectRole ));

    return m_bInSquad ? (pScore->squad() == m_sSquadName) : (pScore->squad() != m_sSquadName);
}
