#ifndef COMPETITIONDISCIPLINEREPOSITORY_H
#define COMPETITIONDISCIPLINEREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/competitiondiscipline.h"

class CompetitionDisciplineRepository : public AbstractRepository< CompetitionDiscipline >
{
public:
    using AbstractRepository::AbstractRepository;

    QList< CompetitionDiscipline* > fetchByCompetition(Competition *competition, int* disciplineId = nullptr );
    QList< CompetitionDiscipline* > load( int eventId, QString competitionNumber = QString(), int disciplineId = 0);
};

#endif // COMPETITIONDISCIPLINEREPOSITORY_H
