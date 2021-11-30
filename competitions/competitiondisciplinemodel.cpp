#include "competitiondisciplinemodel.h"
#include "model/entitymanager.h"
#include "model/repository/competitiondisciplinerepository.h"
#include "model/repository/disciplinerepository.h"
#include <QIcon>

CompetitionDisciplineModel::CompetitionDisciplineModel(EntityManager *em, QObject *parent)
    : QAbstractTableModel(parent)
    , m_em(em)
{
}

int CompetitionDisciplineModel::rowCount(const QModelIndex &) const
{
    return m_disciplines.size();
}

int CompetitionDisciplineModel::columnCount(const QModelIndex &) const
{
    return 8;
}

QVariant CompetitionDisciplineModel::headerData(int section, Qt::Orientation orientation, int role) const
{
    if (role == Qt::DisplayRole && orientation == Qt::Horizontal) {
        switch (section) {
        case 2:
            return tr("Sport");
        case 3:
            return tr("Disziplin");
        case 4:
            return tr("m/w");
        case 5:
            return tr("Ausschreibungstext");
        case 6:
            return tr("KP");
        case 7:
            return tr("max. Pkt.");
        }
    }
    return QVariant();
}

QVariant CompetitionDisciplineModel::data(const QModelIndex &index, int role) const
{
    if (!index.isValid())
        return QVariant();

    auto discipline = m_disciplines.at(index.row());
    auto competitionDiscipline = m_competitionDisciplines.value(discipline->id());
    if (role == Qt::DisplayRole || role == Qt::EditRole) {
        switch (index.column()) {
        case 2:
            return discipline->sport()->name();
        case 3:
            return discipline->name();
        case 4:
            return discipline->genderText();
        case 5:
            if (competitionDiscipline != nullptr) {
                return competitionDiscipline->invitationText();
            }
            break;
        case 7:
            if (competitionDiscipline != nullptr) {
                return competitionDiscipline->maximumScore();
            }
            break;
        }
    } else if (role == Qt::CheckStateRole) {
        switch (index.column()) {
        case 0:
            return competitionDiscipline != nullptr ? Qt::Checked : Qt::Unchecked;
        case 6:
            if (competitionDiscipline != nullptr) {
                return competitionDiscipline->freeAndCompulsary() ? Qt::Checked : Qt::Unchecked;
            }
            return Qt::Unchecked;
        }
    } else if (role == Qt::DecorationRole) {
        switch (index.column()) {
        case 1:
            return QIcon(discipline->icon());
        }
    } else if (role == Qt::TextAlignmentRole) {
        switch (index.column()) {
        case 4:
            return Qt::AlignCenter;
        }
    }
    return QVariant();
}

bool CompetitionDisciplineModel::setData(const QModelIndex &index, const QVariant &value, int role /*= Qt::EditRole*/)
{
    if(!index.isValid() || role != Qt::EditRole){
        return false;
    }

    auto discipline = m_disciplines.at(index.row());
    auto competitionDiscipline = m_competitionDisciplines.value(discipline->id());

    if(!competitionDiscipline){
        competitionDiscipline = new CompetitionDiscipline();
        competitionDiscipline->setCompetition(m_competition);
        competitionDiscipline->setDiscipline(discipline);
        m_competitionDisciplines.insert(competitionDiscipline->disciplineId(), competitionDiscipline);
    }

    switch (index.column()) {
    case 5:
        competitionDiscipline->setInvitationText(value.toString());
        return true;
    case 7:
        competitionDiscipline->setMaximumScore(value.toDouble());
        return true;
    }

    return false;
}

Qt::ItemFlags CompetitionDisciplineModel::flags(const QModelIndex &index) const
{
    auto flags = QAbstractItemModel::flags(index);

    if( index.isValid() ){
        switch (index.column()) {
        case 5:
            return flags | Qt::ItemIsEditable;
        case 7:
            return flags | Qt::ItemIsEditable;
        }
    }

    return flags;
}

void CompetitionDisciplineModel::fetchDisciplines(Competition *competition, bool women, bool men)
{
    m_competition = competition;

    QList<CompetitionDiscipline *> competitionDisciplines = m_em->competitionDisciplineRepository()
                                                                ->fetchByCompetition(m_competition);

    beginResetModel();
    m_disciplines = m_em->disciplineRepository()->loadByGender(women, men);
    m_competitionDisciplines.clear();
    for (auto competitionDiscipline : competitionDisciplines) {
        m_competitionDisciplines.insert(competitionDiscipline->disciplineId(),
                                        competitionDiscipline);
    }
    endResetModel();
}
