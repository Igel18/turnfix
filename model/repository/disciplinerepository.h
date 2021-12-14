#ifndef DISCIPLINEREPOSITORY_H
#define DISCIPLINEREPOSITORY_H

#include "abstractrepository.h"
#include "model/entity/discipline.h"

class DisciplineRepository : public AbstractRepository<Discipline>
{
public:
    explicit DisciplineRepository(EntityManager *em);

    //!
    //! \brief loadDisciplines loads disciplines from db
    //! \param women if not nullptr then passed to the query as a "WHERE" predicate
    //! \param men if not nullptr then passed to the query as a "WHERE" predicate
    //! \param joinFormula if true query is appended with "JOIN" expression for formula table
    //! \return disciplines (depends on params combination: women = true => "w" + "w/m"; men = true => "m" + "w/m" etc.)
    //!
    QList<Discipline *> loadDisciplines(const bool* const women = nullptr, const bool* const men = nullptr, bool joinFormula = true );

    Discipline* loadDiscipline(int id);
};

#endif // DISCIPLINEREPOSITORY_H
