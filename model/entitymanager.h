#ifndef ENTITYMANAGER_H
#define ENTITYMANAGER_H

#include <QObject>

class AthleteRepository;
class BankAccountRepository;
class ClubRepository;
class CompetitionRepository;
class CompetitionDisciplineRepository;
class ConnectionRepository;
class CountryRepository;
class DisciplineRepository;
class DisciplineFieldRepository;
class DisciplineGroupRepository;
class DisciplineGroupItemRepository;
class DivisionRepository;
class EventRepository;
class FormulaRepository;
class JuryScoreRepository;
class LayoutRepository;
class LayoutFieldRepository;
class PenaltyRepository;
class PersonRepository;
class RegionRepository;
class ScoreRepository;
class ScoreDetailsRepository;
class ScoreDisciplineRepository;
class SportRepository;
class SquadDisciplineRepository;
class StartingOrderRepository;
class StateRepository;
class StatusRepository;
class VenueRepository;

class EntityManager : public QObject
{
    Q_OBJECT

public:
    EntityManager(QObject *parent = nullptr);

    AthleteRepository *athleteRepository() const;
    BankAccountRepository *bankAccountRepository() const;
    ClubRepository *clubRepository() const;
    CompetitionRepository *competitionRepository() const;
    CompetitionDisciplineRepository *competitionDisciplineRepository() const;
    ConnectionRepository *connectionRepository() const;
    CountryRepository *countryRepository() const;
    DisciplineRepository *disciplineRepository() const;
    DisciplineFieldRepository *disciplineFieldRepository() const;
    DisciplineGroupRepository *disciplineGroupRepository() const;
    DisciplineGroupItemRepository *disciplineGroupItemRepository() const;
    DivisionRepository *divisionRepository() const;
    EventRepository *eventRepository() const;
    FormulaRepository *formulaRepository() const;
    JuryScoreRepository* juryScoreRepository() const;
    LayoutRepository* layoutRepository() const;
    LayoutFieldRepository* layoutFieldRepository() const;
    PersonRepository *personRepository() const;
    PenaltyRepository *penaltyRepository() const;
    RegionRepository *regionRepository() const;
    ScoreRepository* scoreRepository() const;
    ScoreDetailsRepository* scoreDetailsRepository() const;
    ScoreDisciplineRepository* scoreDisciplineRepository() const;
    SportRepository *sportRepository() const;
    SquadDisciplineRepository *squadDisciplineRepository() const;
    StartingOrderRepository *startingOrderRepository() const;
    StateRepository *stateRepository() const;
    StatusRepository *statusRepository() const;
    VenueRepository *venueRepository() const;

    bool startTransaction();
    bool commitTransaction();

    QString connectionName() const;
    void setConnectionName(const QString &connectionName);

private:
    QString m_connectionName;
    AthleteRepository *m_athleteRepository;
    BankAccountRepository *m_bankAccountRepository;
    ClubRepository *m_clubRepository;
    CompetitionRepository *m_competitionRepository;
    CompetitionDisciplineRepository *m_competitionDisciplineRepository;
    ConnectionRepository *m_connectionRepository;
    CountryRepository *m_countryRepository;
    DisciplineRepository *m_disciplineRepository;
    DisciplineFieldRepository *m_disciplineFieldRepository;
    DisciplineGroupRepository *m_disciplineGroupRepository;
    DisciplineGroupItemRepository *m_disciplineGroupItemRepository;
    DivisionRepository *m_divisionRepository;
    EventRepository *m_eventRepository;
    FormulaRepository *m_formulaRepository;
    JuryScoreRepository* m_JuryScoreRepository;
    LayoutRepository* m_LayoutRepository;
    LayoutFieldRepository* m_LayoutFieldRepository;
    PenaltyRepository *m_penaltyRepository;
    PersonRepository *m_personRepository;
    RegionRepository *m_regionRepository;
    ScoreRepository* m_scoreRepository;
    ScoreDetailsRepository* m_scoreDetailsRepository;
    ScoreDisciplineRepository* m_scoreDisciplineRepository;
    SportRepository *m_sportRepository;
    SquadDisciplineRepository *m_squadDisciplineRepository;
    StartingOrderRepository *m_startingOrderRepository;
    StateRepository *m_stateRepository;
    StatusRepository *m_statusRepository;
    VenueRepository *m_venueRepository;
};

#endif // ENTITYMANAGER_H
