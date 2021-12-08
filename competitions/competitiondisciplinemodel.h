#ifndef COMPETITIONDISCIPLINEMODEL_H
#define COMPETITIONDISCIPLINEMODEL_H

#include <QAbstractTableModel>

class EntityManager;
class Competition;
class Discipline;
class Division;
class CompetitionDiscipline;

class CompetitionDisciplineModel : public QAbstractTableModel
{
    Q_OBJECT

public:
    explicit CompetitionDisciplineModel(Competition *competition, EntityManager *em, QObject *parent = nullptr);
    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    int columnCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant headerData(int section, Qt::Orientation orientation, int role = Qt::DisplayRole) const override;
    QVariant data(const QModelIndex &index, int role = Qt::DisplayRole) const override;

    bool setData(const QModelIndex &index, const QVariant &value, int role = Qt::EditRole) override;
    Qt::ItemFlags flags(const QModelIndex &index) const override;

public slots:
    void fetchDisciplines(int divisionId);
    void save();

private:
    CompetitionDiscipline* competitionDiscipline(int disciplineId);

private:
    QList<Discipline *> m_disciplines;
    QMap<int, CompetitionDiscipline *> m_competitionDisciplines;
    Competition *m_competition;
    EntityManager *m_em;
};

#endif // COMPETITIONDISCIPLINEMODEL_H
