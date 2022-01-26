#include "competitiondisciplinemodel.h"
#include "model/entitymanager.h"
#include "model/repository/competitiondisciplinerepository.h"
#include "model/repository/disciplinerepository.h"
#include <QIcon>

CompetitionDisciplineModel::CompetitionDisciplineModel(Competition *competition, EntityManager *em, QObject *parent)
    : QAbstractTableModel(parent), m_competition(competition), m_em(em)
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

    if(role == TF::IdRole){
        return discipline->id();
    }

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
        case 0:{
            if(competitionDiscipline){
                return competitionDiscipline->selected() ? Qt::Checked : Qt::Unchecked;
            }

            return Qt::Unchecked;
        }

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
    if(!index.isValid()){
        return false;
    }

    if( role == Qt::CheckStateRole ) {
        switch (index.column()) {
        case 0:{
            auto discipline = m_disciplines.at(index.row());
            auto competDiscipline = competitionDiscipline(discipline->id());
            competDiscipline->setSelected(!competDiscipline->selected());
            return true;
        }
        case 6:{
            auto discipline = m_disciplines.at(index.row());
            auto competDiscipline = competitionDiscipline(discipline->id());
            competDiscipline->setFreeAndCompulsary(!competDiscipline->freeAndCompulsary());
            return true;
        }
        }
        return false;
    }

    if( role != Qt::EditRole )
        return false;

    auto discipline = m_disciplines.at(index.row());
    auto competitionDiscipline = m_competitionDisciplines.value(discipline->id());

    if(!competitionDiscipline){
        competitionDiscipline = new CompetitionDiscipline();
        competitionDiscipline->setCompetition(m_competition);
        competitionDiscipline->setDiscipline(discipline);
        m_competitionDisciplines.insert(competitionDiscipline->disciplineId(), competitionDiscipline);
    }

    switch (index.column()) {
    case 5: {
        const auto oldValue = competitionDiscipline->invitationText();
        const auto newValue = value.toString();
        if( oldValue != newValue ){
            competitionDiscipline->setInvitationText( newValue );
            return true;
        }
        break;
    }
    case 7: {
        const auto oldValue = competitionDiscipline->maximumScore();
        const auto newValue = value.toDouble();
        if(oldValue != newValue){
            competitionDiscipline->setMaximumScore(newValue);
            return true;
        }
        break;
    }
    }

    return false;
}

Qt::ItemFlags CompetitionDisciplineModel::flags(const QModelIndex &index) const
{
    auto flags = QAbstractItemModel::flags(index);

    if( index.isValid() ){
        switch (index.column()) {
        case 0:
            return flags | Qt::ItemIsUserCheckable;
        case 5:
            return flags | Qt::ItemIsEditable;
        case 6:
            return flags | Qt::ItemIsUserCheckable;
        case 7:
            return flags | Qt::ItemIsEditable;
        }
    }

    return flags;
}

void CompetitionDisciplineModel::fetchDisciplines(int divisionId)
{
    const auto competitionDisciplines = m_em->competitionDisciplineRepository()->fetchByCompetition(m_competition);

    bool bTrue = true;

    bool* bWomen = nullptr;
    bool* bMen = nullptr;

    switch ( divisionId ) {
    case 1: // men
        bMen = &bTrue;
        break;
    case 2: // women
        bWomen = &bTrue;
        break;
    }

    beginResetModel();
    m_disciplines = m_em->disciplineRepository()->loadDisciplines( bWomen, bMen, false );
    m_competitionDisciplines.clear();
    for (auto competitionDiscipline : competitionDisciplines) {
        competitionDiscipline->setSelected(true);
        m_competitionDisciplines.insert(competitionDiscipline->disciplineId(), competitionDiscipline);
    }
    endResetModel();
}

CompetitionDiscipline* CompetitionDisciplineModel::competitionDiscipline(int disciplineId)
{
    auto competitionDiscipline = m_competitionDisciplines.value(disciplineId);

    if( !competitionDiscipline ){
        competitionDiscipline = new CompetitionDiscipline();
        competitionDiscipline->setCompetition(m_competition);
        auto itFound = std::find_if(m_disciplines.begin(), m_disciplines.end(), [disciplineId](Discipline* item){ return item->id() == disciplineId; });
        if(itFound != m_disciplines.end()){
            competitionDiscipline->setDiscipline(*itFound);
        }

        m_competitionDisciplines.insert(competitionDiscipline->disciplineId(), competitionDiscipline);
    }

    return competitionDiscipline;
}

void CompetitionDisciplineModel::save()
{
    auto repo = m_em->competitionDisciplineRepository();
    for(auto& item: m_competitionDisciplines){
        item->setCompetition( m_competition );

        if(item->selected()){
            repo->persist(item);
        } else {
            repo->remove(item);
        }
    }
}
