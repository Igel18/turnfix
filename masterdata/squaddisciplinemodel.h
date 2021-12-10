#ifndef SQUADDISCIPLINEMODEL_H
#define SQUADDISCIPLINEMODEL_H

#include <QAbstractTableModel>

class EntityManager;
class Event;
class SquadDiscipline;

class SquadDisciplineModel : public QAbstractTableModel
{
    Q_OBJECT
public:
    explicit SquadDisciplineModel(EntityManager *em, Event *event, QObject *parent = nullptr);

    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    int columnCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant headerData(int section, Qt::Orientation orientation, int role = Qt::DisplayRole) const override;
    QVariant data(const QModelIndex &index, int role = Qt::DisplayRole) const override;

    void fetchData( QString squad = QString() );

private:
    QList< SquadDiscipline* > m_data;
    EntityManager *m_em;
    Event *m_event;

};

#endif // SQUADDISCIPLINEMODEL_H
