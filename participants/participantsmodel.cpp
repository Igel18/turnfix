#include "participantsmodel.h"

#include "model/repository/competitionrepository.h"
#include "model/repository/scorerepository.h"

ParticipantsModel::ParticipantsModel(Event *event, EntityManager *em, QObject *parent /*= nullptr*/) :
    QAbstractTableModel(parent), m_em(em), m_event(event)
{

}

int ParticipantsModel::rowCount(const QModelIndex&) const
{
    return m_data.count();
}

int ParticipantsModel::columnCount(const QModelIndex&) const
{
    return 7;
}

QVariant ParticipantsModel::headerData(int section, Qt::Orientation orientation, int role /*= Qt::DisplayRole*/) const
{
    if (role == Qt::DisplayRole && orientation == Qt::Horizontal) {
        static QStringList individual = {"StNr.", "Name", "Geb.", "m/w", "Verein", "WK", "Riege"};
        static QStringList team = {"StNr.", "Verein", "Mannschaft", "WK", "Riege"};
        static QStringList group = {"StNr.", "Gruppe", "Verein", "WK", "Riege"};

        switch (m_Type) {
        case Type::Individual:
            return individual.at(section);
        case Type::Group:
            return group.at(section);
        case Type::Team:
            return team.at(section);
        }
    }

    return QVariant();
}

QVariant ParticipantsModel::data(const QModelIndex &index, int role /*= Qt::DisplayRole*/) const
{
    if (!index.isValid())
        return QVariant();

    auto pScore = m_data.at(index.row());

    if(role == Qt::DisplayRole){
        switch (index.column()) {
        case 0:
            return pScore->bib();
        case 1:
            return QString("%1%2").arg(pScore->athlete()->fullName(), pScore->nonCompetitive() ? " (AK)" : "");
        case 2:
            return pScore->athlete()->dateOfBirth().toString("yy"); // the last 2 digits
        case 3:
            return pScore->athlete()->gender() == Athlete::Male ? "m" : "w";
        case 4:
            return pScore->athlete()->club()->name();
        case 5:
            return pScore->competition()->number();
        case 6:
            return pScore->squad();
        }
    } else if (role == TF::ObjectRole) {
        return QVariant::fromValue( pScore );
    } else if (role == TF::IdRole) {
        return pScore->id();
    }

    return QVariant();
}

bool ParticipantsModel::setData(const QModelIndex &index, const QVariant &value, int role /*= Qt::EditRole*/)
{
    if ( !index.isValid() || role != Qt::EditRole )
        return false;

    auto pScore = m_data.at(index.row());

    switch (index.column()) {
    case 6:
        pScore->setSquad(value.toString());

        if(m_em->scoreRepository()->persist( pScore )){
            emit dataChanged( index, index, { Qt::DisplayRole, Qt::EditRole } );
            return true;
        }
    }

    return false;
}

void ParticipantsModel::load()
{
    qDebug() << "ParticipantsModel::load() ...";

    beginResetModel();
    m_data.clear();

    const auto competitions = m_em->competitionRepository()->fetchByEvent(m_event);

    for(auto& competition: competitions){
        int competitionId = competition->id();

        auto scores = m_em->scoreRepository()->fetch(&competitionId);

        for( auto& score: scores) {
            score->setCompetition(competition);
        }

        m_data.append(scores);
    }
    endResetModel();
}
